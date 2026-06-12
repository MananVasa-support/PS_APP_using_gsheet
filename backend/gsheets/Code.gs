/**
 * ============================================================================
 * Productivity Shastra — Google Sheets backend (Apps Script Web App)
 * ============================================================================
 * ONE web app = the whole API server. Google Drive/Sheets = the database.
 * Replaces Supabase (auth + every tool's data) on the `gsheets-backend` branch.
 *
 * HOW TO DEPLOY (manual, one time):
 *   1. script.google.com → New project → paste this whole file into Code.gs.
 *   2. In Drive, create ONE folder (e.g. "Productivity-Shastra-Data"), open it,
 *      copy the id from the URL (the long string after /folders/) and paste it
 *      into ROOT_FOLDER_ID below.
 *   3. Deploy → New deployment → type "Web app" →
 *        Execute as: Me   |   Who has access: Anyone
 *      → Deploy → authorize → copy the Web app URL (ends in /exec)
 *      → put it in frontend/.env as VITE_API_BASE_URL=<that url>.
 *   4. EVERY time this file changes: Deploy → Manage deployments → edit (pencil)
 *      → Version: New version → Deploy. (The URL stays the same.)
 *
 * EVERYTHING ELSE AUTO-CREATES on demand:
 *   <root folder>
 *     ├─ _System (spreadsheet)            ← users / sessions / _meta sheets
 *     └─ "<user_id> — <email>" (folder, one per user, on first write)
 *          ├─ "Time Auditor"        → entries, challenges
 *          ├─ "Time Finder"         → assessments
 *          ├─ "Meeting"             → meetings
 *          ├─ "Power Planner"       → weeks, reviews, settings
 *          └─ "Reasons Eliminator"  → sessions, grip_tests, grip_history
 *
 * Worksheet row 1 = headers mirroring the old Postgres columns (minus user_id —
 * the per-user FOLDER is the user scope). Every data cell is JSON-encoded
 * (strings show quotes; objects/arrays are JSON strings) so types round-trip.
 *
 * SECURITY MODEL (replaces Postgres RLS):
 *   - passwords: SHA-256(salt + password), per-user random salt. Never plain.
 *   - every data request carries a session token; the token resolves to ONE
 *     user id, and every data route can only ever open spreadsheets registered
 *     under that user id in _meta. There is no route that takes a foreign
 *     user id. The leaderboard aggregates server-side and returns only
 *     name + scores (same as the old SECURITY DEFINER RPC).
 *
 * API (all POST, JSON body, Content-Type text/plain to avoid CORS preflight):
 *   { route: '/login', ... }  → { ok:true, data:{...}, ms:<server ms> }
 *                              | { ok:false, error:{ message, code }, ms }
 *   Auth:  /signup /login /logout /me /availability
 *          /requestReset /verifyReset /updatePassword
 *          /requestEmailChange /verifyEmailChange /updateProfile
 *   Data:  /list /upsert /delete /clear   ({ token, tool, sheet|sheets, rows|ids|where })
 *          /leaderboard
 *
 * QUOTAS (free consumer account): MailApp ≈ 100 emails/day (signup OTP was
 * dropped on this branch; only password-reset / email-change codes send mail).
 * URL-fetchless, so the main limit is runtime: 6 min/request (we use ~1-3 s).
 * ============================================================================
 */

// ─── CONFIG — the ONLY thing you edit by hand ───────────────────────────────
const ROOT_FOLDER_ID = 'PASTE_YOUR_DRIVE_FOLDER_ID_HERE';

const SESSION_DAYS = 7;        // server-side session lifetime (frontend uses sessionStorage, so a fresh launch logs out anyway)
const CODE_TTL_MIN = 15;       // password-reset / email-change codes expire after this
const APP_NAME = 'Productivity Shastra';

// ─── Tool registry — mirrors backend/supabase/schema.sql ────────────────────
// keyCol = the column /upsert merges on and /delete matches ids against.
const TOOLS = {
  'time-auditor': {
    file: 'Time Auditor',
    sheets: {
      entries:    { headers: ['id', 'entry', 'created_at'], keyCol: 'id' },
      challenges: { headers: ['id', 'days', 'status', 'started_at', 'completed_at', 'created_at'], keyCol: 'id' },
    },
  },
  'time-finder': {
    file: 'Time Finder',
    sheets: {
      assessments: { headers: ['id', 'assessment', 'archived', 'created_at'], keyCol: 'id' },
    },
  },
  meeting: {
    file: 'Meeting',
    sheets: {
      meetings: { headers: ['id', 'meeting', 'created_at', 'updated_at'], keyCol: 'id' },
    },
  },
  'power-planner': {
    file: 'Power Planner',
    sheets: {
      weeks:    { headers: ['week_start', 'data', 'updated_at'], keyCol: 'week_start' },
      reviews:  { headers: ['week_start', 'completion_pct', 'productivity_score', 'total_commitments', 'planned_hours', 'delegated_count', 'insights', 'updated_at'], keyCol: 'week_start' },
      settings: { headers: ['id', 'start_date', 'schedule', 'custom_options', 'gcal_event_ids', 'updated_at'], keyCol: 'id' }, // singleton row, id='settings'
    },
  },
  reasons: {
    file: 'Reasons Eliminator',
    sheets: {
      sessions:     { headers: ['id', 'status', 'source', 'week_start', 'reasons', 'created_at', 'updated_at'], keyCol: 'id' },
      grip_tests:   { headers: ['reason_id', 'session_id', 'seq', 'reason_text', 'reason_date', 'score', 'status', 'updated_at'], keyCol: 'reason_id' },
      grip_history: { headers: ['id', 'run_date', 'month', 'archived', 'entries', 'updated_at'], keyCol: 'id' },
    },
  },
};

const USERS_HEADERS = [
  'id', 'name', 'email', 'phone', 'country', 'role', 'status',
  'title', 'department', 'timezone', 'avatar', 'preferences',
  'password_hash', 'salt', 'pending_email', 'code_hash', 'code_type', 'code_expires',
  'created_at',
];
const SESSIONS_HEADERS = ['token', 'user_id', 'created_at', 'expires'];
const META_HEADERS = ['key', 'value'];

// Columns that must NEVER leave the server.
const PRIVATE_USER_COLS = ['password_hash', 'salt', 'pending_email', 'code_hash', 'code_type', 'code_expires'];

// ─── Entry points ────────────────────────────────────────────────────────────
function doGet() {
  return jsonOut({ ok: true, service: 'productivity-shastra-gsheets', time: new Date().toISOString() });
}

function doPost(e) {
  const t0 = Date.now();
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, error: { message: 'Invalid JSON body.', code: 'BAD_JSON' }, ms: Date.now() - t0 });
  }
  try {
    const data = routeRequest(body);
    return jsonOut({ ok: true, data: data === undefined ? null : data, ms: Date.now() - t0 });
  } catch (err) {
    const message = (err && err.message) || 'Unexpected server error.';
    const code = (err && err.code) || 'SERVER_ERROR';
    return jsonOut({ ok: false, error: { message: message, code: code }, ms: Date.now() - t0 });
  }
}

function routeRequest(body) {
  const route = String(body.route || '');
  switch (route) {
    // auth
    case '/signup':             return signupRoute(body);
    case '/login':              return loginRoute(body);
    case '/logout':             return logoutRoute(body);
    case '/me':                 return publicUser(requireUser(body));
    case '/availability':       return availabilityRoute(body);
    case '/requestReset':       return requestResetRoute(body);
    case '/verifyReset':        return verifyResetRoute(body);
    case '/updatePassword':     return updatePasswordRoute(body);
    case '/requestEmailChange': return requestEmailChangeRoute(body);
    case '/verifyEmailChange':  return verifyEmailChangeRoute(body);
    case '/updateProfile':      return updateProfileRoute(body);
    // data
    case '/list':               return listRoute(body);
    case '/upsert':             return upsertRoute(body);
    case '/delete':             return deleteRoute(body);
    case '/clear':              return clearRoute(body);
    case '/leaderboard':        return leaderboardRoute(body);
    default:
      throw apiError('Unknown route: ' + route, 'NOT_FOUND');
  }
}

// ─── Small utilities ─────────────────────────────────────────────────────────
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function apiError(message, code) {
  const e = new Error(message);
  e.code = code || 'BAD_REQUEST';
  return e;
}

function sha256Hex(str) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function newToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function sixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function nowIso() {
  return new Date().toISOString();
}

function cache() {
  return CacheService.getScriptCache();
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

// Every data cell is JSON-encoded so types (string/number/bool/object/null)
// round-trip exactly. Empty cell = null.
function encodeCell(v) {
  if (v === undefined || v === null) return '';
  return JSON.stringify(v);
}
function decodeCell(v) {
  if (v === '' || v === null || v === undefined) return null;
  const s = String(v);
  try {
    return JSON.parse(s);
  } catch (e) {
    return s; // legacy / hand-edited cell — return as raw string
  }
}

// ─── System spreadsheet (users / sessions / _meta) ───────────────────────────
function getRootFolder() {
  if (!ROOT_FOLDER_ID || ROOT_FOLDER_ID.indexOf('PASTE_') === 0) {
    throw apiError('ROOT_FOLDER_ID is not set in the Apps Script.', 'NOT_CONFIGURED');
  }
  return DriveApp.getFolderById(ROOT_FOLDER_ID);
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Plain-text format everywhere so Sheets never coerces ISO dates / numbers.
    sheet.getRange(1, 1, sheet.getMaxRows(), Math.max(headers.length, sheet.getMaxColumns())).setNumberFormat('@');
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getSystemSS() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('system_ss_id');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      /* deleted? fall through and recreate */
    }
  }
  return withLock(function () {
    // Re-check inside the lock (another request may have just created it).
    const again = PropertiesService.getScriptProperties().getProperty('system_ss_id');
    if (again) return SpreadsheetApp.openById(again);

    const root = getRootFolder();
    let ss = null;
    const existing = root.getFilesByName('_System');
    if (existing.hasNext()) {
      ss = SpreadsheetApp.openById(existing.next().getId());
    } else {
      ss = SpreadsheetApp.create('_System');
      DriveApp.getFileById(ss.getId()).moveTo(root);
    }
    ensureSheetWithHeaders(ss, 'users', USERS_HEADERS);
    ensureSheetWithHeaders(ss, 'sessions', SESSIONS_HEADERS);
    const meta = ensureSheetWithHeaders(ss, '_meta', META_HEADERS);
    meta.hideSheet();
    const def = ss.getSheetByName('Sheet1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
    PropertiesService.getScriptProperties().setProperty('system_ss_id', ss.getId());
    return ss;
  });
}

// Generic sheet → array of row objects (decoded), plus the raw row index so
// writers can address rows directly. Headers come from row 1.
function readTable(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return { headers: [], rows: [] };
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(String);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    let empty = true;
    for (let c = 0; c < headers.length; c++) {
      const v = decodeCell(values[i][c]);
      obj[headers[c]] = v;
      if (v !== null) empty = false;
    }
    if (!empty) rows.push({ _row: i + 1, data: obj });
  }
  return { headers: headers, rows: rows };
}

function writeRow(sheet, headers, rowIndex, obj) {
  const line = headers.map(function (h) { return encodeCell(obj[h]); });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([line]);
}

function appendRow(sheet, headers, obj) {
  sheet.appendRow(headers.map(function (h) { return encodeCell(obj[h]); }));
}

// ─── _meta (durable id map) + CacheService in front ─────────────────────────
function metaGet(key) {
  const hit = cache().get('meta:' + key);
  if (hit) return hit;
  const meta = getSystemSS().getSheetByName('_meta');
  const t = readTable(meta);
  for (let i = 0; i < t.rows.length; i++) {
    if (t.rows[i].data.key === key) {
      const val = t.rows[i].data.value;
      if (val) cache().put('meta:' + key, String(val), 21600);
      return val;
    }
  }
  return null;
}

function metaSet(key, value) {
  const meta = getSystemSS().getSheetByName('_meta');
  const t = readTable(meta);
  for (let i = 0; i < t.rows.length; i++) {
    if (t.rows[i].data.key === key) {
      writeRow(meta, META_HEADERS, t.rows[i]._row, { key: key, value: value });
      cache().put('meta:' + key, String(value), 21600);
      return;
    }
  }
  appendRow(meta, META_HEADERS, { key: key, value: value });
  cache().put('meta:' + key, String(value), 21600);
}

// ─── Users / sessions ────────────────────────────────────────────────────────
function usersSheet() {
  return getSystemSS().getSheetByName('users');
}
function sessionsSheet() {
  return getSystemSS().getSheetByName('sessions');
}

function findUserBy(field, value) {
  const t = readTable(usersSheet());
  const needle = field === 'email' ? String(value || '').trim().toLowerCase() : String(value || '').trim();
  if (!needle) return null;
  for (let i = 0; i < t.rows.length; i++) {
    const have = t.rows[i].data[field];
    const norm = field === 'email' ? String(have || '').toLowerCase() : String(have || '');
    if (norm === needle) return t.rows[i];
  }
  return null;
}

function publicUser(userRow) {
  const out = {};
  USERS_HEADERS.forEach(function (h) {
    if (PRIVATE_USER_COLS.indexOf(h) === -1) out[h] = userRow.data[h];
  });
  return out;
}

function requireUser(body) {
  const token = String(body.token || '');
  if (!token) throw apiError('Not signed in.', 'AUTH_REQUIRED');

  let userId = cache().get('tok:' + token);
  if (!userId) {
    const t = readTable(sessionsSheet());
    for (let i = 0; i < t.rows.length; i++) {
      const s = t.rows[i].data;
      if (s.token === token) {
        if (s.expires && new Date(s.expires) < new Date()) {
          throw apiError('Session expired. Please log in again.', 'AUTH_INVALID');
        }
        userId = String(s.user_id);
        cache().put('tok:' + token, userId, 1800);
        break;
      }
    }
  }
  if (!userId) throw apiError('Invalid session. Please log in again.', 'AUTH_INVALID');

  const userRow = findUserBy('id', userId);
  if (!userRow) throw apiError('Account no longer exists.', 'AUTH_INVALID');
  return userRow;
}

// ─── Auth routes ─────────────────────────────────────────────────────────────
function availabilityRoute(body) {
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  return {
    email_taken: !!(email && findUserBy('email', email)),
    phone_taken: !!(phone && findUserBy('phone', phone)),
  };
}

function signupRoute(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const country = String(body.country || '').trim();
  const password = String(body.password || '');

  if (!name) throw apiError('Name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw apiError('Enter a valid email address.');
  if (password.length < 8) throw apiError('Password must be at least 8 characters.');

  return withLock(function () {
    if (findUserBy('email', email)) throw apiError('An account already exists with this email.', 'DUPLICATE');
    if (phone && findUserBy('phone', phone)) throw apiError('An account already exists with this phone number.', 'DUPLICATE');

    const salt = Utilities.getUuid();
    const user = {
      id: Utilities.getUuid(),
      name: name,
      email: email,
      phone: phone || null,
      country: country || null,
      role: 'client',
      status: 'Active',
      title: null, department: null, timezone: null, avatar: null,
      preferences: {},
      password_hash: sha256Hex(salt + password),
      salt: salt,
      pending_email: null, code_hash: null, code_type: null, code_expires: null,
      created_at: nowIso(),
    };
    appendRow(usersSheet(), USERS_HEADERS, user);
    // No auto-login (matches the Supabase branch: return to login after signup).
    return { user: publicUser({ data: user }) };
  });
}

function loginRoute(body) {
  const email = String(body.email || '').trim();
  const password = String(body.password || '');
  const userRow = findUserBy('email', email);
  if (!userRow) throw apiError('Invalid email or password.', 'AUTH_INVALID');
  const u = userRow.data;
  if (sha256Hex(String(u.salt) + password) !== u.password_hash) {
    throw apiError('Invalid email or password.', 'AUTH_INVALID');
  }
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  appendRow(sessionsSheet(), SESSIONS_HEADERS, {
    token: token, user_id: u.id, created_at: nowIso(), expires: expires,
  });
  cache().put('tok:' + token, String(u.id), 1800);
  return { token: token, user: publicUser(userRow) };
}

function logoutRoute(body) {
  const token = String(body.token || '');
  if (!token) return { ok: true };
  cache().remove('tok:' + token);
  withLock(function () {
    const sheet = sessionsSheet();
    const t = readTable(sheet);
    for (let i = t.rows.length - 1; i >= 0; i--) {
      if (t.rows[i].data.token === token) sheet.deleteRow(t.rows[i]._row);
    }
  });
  return { ok: true };
}

function setUserFields(userRow, patch) {
  const merged = {};
  USERS_HEADERS.forEach(function (h) { merged[h] = userRow.data[h]; });
  Object.keys(patch).forEach(function (k) { merged[k] = patch[k]; });
  writeRow(usersSheet(), USERS_HEADERS, userRow._row, merged);
  return { _row: userRow._row, data: merged };
}

function sendCodeEmail(email, code, purpose) {
  MailApp.sendEmail({
    to: email,
    subject: APP_NAME + ' — your ' + purpose + ' code',
    htmlBody:
      '<p>Your ' + purpose + ' code for <b>' + APP_NAME + '</b> is:</p>' +
      '<p style="font-size:28px;font-weight:bold;letter-spacing:6px">' + code + '</p>' +
      '<p>It expires in ' + CODE_TTL_MIN + ' minutes. If you didn\'t request this, ignore this email.</p>',
  });
}

function requestResetRoute(body) {
  const email = String(body.email || '').trim();
  const userRow = findUserBy('email', email);
  if (!userRow) return { exists: false };
  const code = sixDigitCode();
  setUserFields(userRow, {
    code_hash: sha256Hex(userRow.data.salt + code),
    code_type: 'recovery',
    code_expires: new Date(Date.now() + CODE_TTL_MIN * 60000).toISOString(),
  });
  sendCodeEmail(email, code, 'password reset');
  return { exists: true };
}

function checkCode(userRow, code, type) {
  const u = userRow.data;
  if (!u.code_hash || u.code_type !== type) return false;
  if (u.code_expires && new Date(u.code_expires) < new Date()) return false;
  return sha256Hex(String(u.salt) + String(code).trim()) === u.code_hash;
}

function verifyResetRoute(body) {
  const userRow = findUserBy('email', body.email);
  if (!userRow || !checkCode(userRow, body.code, 'recovery')) {
    throw apiError('That code is invalid or has expired. Request a new one.', 'CODE_INVALID');
  }
  // Swap the 6-digit code for a one-time reset token (so the code can't be reused).
  const resetToken = newToken();
  setUserFields(userRow, {
    code_hash: sha256Hex(userRow.data.salt + resetToken),
    code_type: 'reset_ok',
    code_expires: new Date(Date.now() + CODE_TTL_MIN * 60000).toISOString(),
  });
  return { ok: true, resetToken: resetToken };
}

function updatePasswordRoute(body) {
  const password = String(body.password || '');
  if (password.length < 8) throw apiError('Password must be at least 8 characters.');
  const userRow = findUserBy('email', body.email);
  if (!userRow || !checkCode(userRow, body.resetToken, 'reset_ok')) {
    throw apiError('This reset link has expired — request a new code.', 'CODE_INVALID');
  }
  const salt = Utilities.getUuid();
  setUserFields(userRow, {
    salt: salt,
    password_hash: sha256Hex(salt + password),
    code_hash: null, code_type: null, code_expires: null,
  });
  // Kill every existing session for this account (password changed).
  withLock(function () {
    const sheet = sessionsSheet();
    const t = readTable(sheet);
    for (let i = t.rows.length - 1; i >= 0; i--) {
      if (String(t.rows[i].data.user_id) === String(userRow.data.id)) {
        cache().remove('tok:' + t.rows[i].data.token);
        sheet.deleteRow(t.rows[i]._row);
      }
    }
  });
  return { message: 'Password updated. Please log in with your new password.' };
}

function requestEmailChangeRoute(body) {
  const userRow = requireUser(body);
  const newEmail = String(body.newEmail || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) throw apiError('Enter a valid email address.');
  if (findUserBy('email', newEmail)) throw apiError('An account already exists with this email.', 'DUPLICATE');
  const code = sixDigitCode();
  setUserFields(userRow, {
    pending_email: newEmail,
    code_hash: sha256Hex(userRow.data.salt + code),
    code_type: 'email_change',
    code_expires: new Date(Date.now() + CODE_TTL_MIN * 60000).toISOString(),
  });
  sendCodeEmail(newEmail, code, 'email change');
  return { ok: true };
}

function verifyEmailChangeRoute(body) {
  const userRow = requireUser(body);
  if (!checkCode(userRow, body.code, 'email_change')) {
    throw apiError('That code is invalid or has expired. Try changing your email again.', 'CODE_INVALID');
  }
  const newEmail = userRow.data.pending_email;
  if (!newEmail) throw apiError('No email change in progress.');
  if (findUserBy('email', newEmail)) throw apiError('An account already exists with this email.', 'DUPLICATE');
  setUserFields(userRow, {
    email: newEmail,
    pending_email: null, code_hash: null, code_type: null, code_expires: null,
  });
  return { ok: true };
}

const PROFILE_FIELDS = ['name', 'title', 'department', 'phone', 'country', 'timezone', 'avatar', 'preferences'];

function updateProfileRoute(body) {
  const userRow = requireUser(body);
  const patch = {};
  PROFILE_FIELDS.forEach(function (k) {
    if (body.patch && body.patch[k] !== undefined) patch[k] = body.patch[k];
  });
  if (patch.phone && String(patch.phone) !== String(userRow.data.phone || '')) {
    const dupe = findUserBy('phone', patch.phone);
    if (dupe && String(dupe.data.id) !== String(userRow.data.id)) {
      throw apiError('An account already exists with this phone number.', 'DUPLICATE');
    }
  }
  const updated = Object.keys(patch).length ? setUserFields(userRow, patch) : userRow;
  return publicUser(updated);
}

// ─── Per-user tool spreadsheets ──────────────────────────────────────────────
function getUserFolder(user) {
  const key = 'folder:' + user.id;
  const cached = metaGet(key);
  if (cached) {
    try {
      return DriveApp.getFolderById(cached);
    } catch (e) {
      /* deleted by hand — recreate below */
    }
  }
  return withLock(function () {
    const again = metaGet(key);
    if (again) {
      try { return DriveApp.getFolderById(again); } catch (e) { /* recreate */ }
    }
    const folder = getRootFolder().createFolder(user.id + ' — ' + user.email);
    metaSet(key, folder.getId());
    return folder;
  });
}

function getToolSS(user, toolKey) {
  const tool = TOOLS[toolKey];
  if (!tool) throw apiError('Unknown tool: ' + toolKey, 'BAD_REQUEST');
  const key = 'ss:' + user.id + ':' + toolKey;
  const cached = metaGet(key);
  if (cached) {
    try {
      return SpreadsheetApp.openById(cached);
    } catch (e) {
      /* deleted by hand — recreate below */
    }
  }
  return withLock(function () {
    const again = metaGet(key);
    if (again) {
      try { return SpreadsheetApp.openById(again); } catch (e) { /* recreate */ }
    }
    const folder = getUserFolder(user);
    const ss = SpreadsheetApp.create(tool.file);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    Object.keys(tool.sheets).forEach(function (name) {
      ensureSheetWithHeaders(ss, name, tool.sheets[name].headers);
    });
    const def = ss.getSheetByName('Sheet1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
    metaSet(key, ss.getId());
    return ss;
  });
}

function getToolSheet(user, toolKey, sheetName) {
  const tool = TOOLS[toolKey];
  if (!tool || !tool.sheets[sheetName]) {
    throw apiError('Unknown sheet "' + sheetName + '" for tool "' + toolKey + '".', 'BAD_REQUEST');
  }
  const ss = getToolSS(user, toolKey);
  return {
    sheet: ensureSheetWithHeaders(ss, sheetName, tool.sheets[sheetName].headers),
    headers: tool.sheets[sheetName].headers,
    keyCol: tool.sheets[sheetName].keyCol,
  };
}

// Does this user have a tool spreadsheet at all? (Read-only check that does NOT
// auto-create — used by /leaderboard so users without data are skipped cheaply.)
function peekToolSS(userId, toolKey) {
  const id = metaGet('ss:' + userId + ':' + toolKey);
  if (!id) return null;
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    return null;
  }
}

// ─── Data routes ─────────────────────────────────────────────────────────────
function listRoute(body) {
  const user = requireUser(body).data;
  const names = body.sheets || (body.sheet ? [body.sheet] : []);
  if (!names.length) throw apiError('No sheet requested.', 'BAD_REQUEST');
  const out = {};
  names.forEach(function (name) {
    // Don't auto-create spreadsheets just to read nothing.
    const existing = peekToolSS(user.id, String(body.tool));
    if (!existing) {
      out[name] = [];
      return;
    }
    const ref = getToolSheet(user, String(body.tool), name);
    out[name] = readTable(ref.sheet).rows.map(function (r) { return r.data; });
  });
  return body.sheet && !body.sheets ? out[body.sheet] : out;
}

function upsertRoute(body) {
  const user = requireUser(body).data;
  const rows = body.rows || [];
  if (!rows.length) return [];
  const ref = getToolSheet(user, String(body.tool), String(body.sheet));
  return withLock(function () {
    const table = readTable(ref.sheet);
    const byKey = {};
    table.rows.forEach(function (r) { byKey[String(r.data[ref.keyCol])] = r; });
    const results = [];
    rows.forEach(function (incoming) {
      const keyVal = String(incoming[ref.keyCol]);
      if (!keyVal || keyVal === 'undefined' || keyVal === 'null') {
        throw apiError('Row is missing its key column "' + ref.keyCol + '".', 'BAD_REQUEST');
      }
      const existing = byKey[keyVal];
      if (existing) {
        // MERGE: only the provided columns change (lets callers send patches).
        const merged = {};
        ref.headers.forEach(function (h) {
          merged[h] = incoming[h] !== undefined ? incoming[h] : existing.data[h];
        });
        writeRow(ref.sheet, ref.headers, existing._row, merged);
        existing.data = merged;
        results.push(merged);
      } else {
        const fresh = {};
        ref.headers.forEach(function (h) {
          if (incoming[h] !== undefined) fresh[h] = incoming[h];
          else if (h === 'created_at' || h === 'updated_at') fresh[h] = nowIso(); // sane default on insert
          else fresh[h] = null;
        });
        appendRow(ref.sheet, ref.headers, fresh);
        byKey[keyVal] = { data: fresh };
        results.push(fresh);
      }
    });
    return results;
  });
}

function deleteRoute(body) {
  const user = requireUser(body).data;
  const ids = (body.ids || []).map(String);
  if (!ids.length) return { deleted: 0 };
  if (!peekToolSS(user.id, String(body.tool))) return { deleted: 0 };
  const ref = getToolSheet(user, String(body.tool), String(body.sheet));
  return withLock(function () {
    const table = readTable(ref.sheet);
    let deleted = 0;
    for (let i = table.rows.length - 1; i >= 0; i--) {
      if (ids.indexOf(String(table.rows[i].data[ref.keyCol])) !== -1) {
        ref.sheet.deleteRow(table.rows[i]._row);
        deleted++;
      }
    }
    return { deleted: deleted };
  });
}

function clearRoute(body) {
  const user = requireUser(body).data;
  if (!peekToolSS(user.id, String(body.tool))) return { deleted: 0 };
  const ref = getToolSheet(user, String(body.tool), String(body.sheet));
  const where = body.where || null; // e.g. { archived: true } — strict equality per column
  return withLock(function () {
    const table = readTable(ref.sheet);
    let deleted = 0;
    for (let i = table.rows.length - 1; i >= 0; i--) {
      const row = table.rows[i].data;
      let match = true;
      if (where) {
        Object.keys(where).forEach(function (k) {
          // Loose-ish boolean compare: jsonb false vs cell null both mean "not archived".
          const a = row[k] === null ? false : row[k];
          const b = where[k] === null ? false : where[k];
          if (JSON.stringify(a) !== JSON.stringify(b)) match = false;
        });
      }
      if (match) {
        ref.sheet.deleteRow(table.rows[i]._row);
        deleted++;
      }
    }
    return { deleted: deleted };
  });
}

// ─── Leaderboard (replaces SQL challenge_leaderboard) ────────────────────────
// Score (0-100), fair across challenge lengths:
//   50% consistency — share of elapsed challenge days with ≥1 Time Auditor audit
//   50% quality     — avg productivity % of audits inside the challenge window
// Participant = each user's most recent non-abandoned run. Same list for all.
function leaderboardRoute(body) {
  requireUser(body); // any signed-in user may view; aggregates only, no raw data
  const hit = cache().get('leaderboard');
  if (hit) return JSON.parse(hit);

  const users = readTable(usersSheet()).rows.map(function (r) { return r.data; });
  const scored = [];

  users.forEach(function (u) {
    const ss = peekToolSS(u.id, 'time-auditor');
    if (!ss) return;
    const chSheet = ss.getSheetByName('challenges');
    if (!chSheet) return;
    const runs = readTable(chSheet).rows
      .map(function (r) { return r.data; })
      .filter(function (c) { return c.status === 'Active Challenge' || c.status === 'Completed Challenge'; })
      .sort(function (a, b) { return new Date(b.started_at) - new Date(a.started_at); });
    if (!runs.length) return;
    const run = runs[0];

    const started = new Date(run.started_at);
    const ended = run.completed_at ? new Date(run.completed_at) : new Date();
    const days = Number(run.days) || 1;
    let daysElapsed = Math.floor((ended - started) / 86400000) + 1;
    daysElapsed = Math.min(days, Math.max(1, daysElapsed));

    const startDay = Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), started.getUTCDate());
    const windowEnd = startDay + days * 86400000;

    const enSheet = ss.getSheetByName('entries');
    const audits = enSheet ? readTable(enSheet).rows.map(function (r) { return r.data; }) : [];
    const auditDays = {};
    let pctSum = 0;
    let pctCount = 0;
    audits.forEach(function (a) {
      const entry = a.entry || {};
      if (!entry.date) return;
      const d = new Date(entry.date);
      if (isNaN(d)) return;
      const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (day < startDay || day >= windowEnd) return;
      auditDays[day] = true;
      pctSum += Number((entry.stats && entry.stats.productivityPct) || 0);
      pctCount++;
    });

    const auditDayCount = Object.keys(auditDays).length;
    const coverageRaw = (100 * Math.min(auditDayCount, daysElapsed)) / daysElapsed;
    const avgPct = pctCount ? pctSum / pctCount : 0;

    scored.push({
      user_id: u.id,
      name: u.name || 'Anonymous',
      days: days,
      status: run.status,
      days_elapsed: daysElapsed,
      coverage_pct: Math.round(coverageRaw),
      avg_productivity: Math.round(avgPct),
      score: Math.round(0.5 * coverageRaw + 0.5 * avgPct),
    });
  });

  scored.sort(function (a, b) {
    return b.score - a.score || b.days_elapsed - a.days_elapsed || String(a.name).localeCompare(String(b.name));
  });
  scored.forEach(function (s, i) { s.rank = i + 1; });

  cache().put('leaderboard', JSON.stringify(scored), 60);
  return scored;
}
