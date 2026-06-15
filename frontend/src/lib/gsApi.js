/**
 * Google Drive/Sheets DIRECT backend — no server at all. The browser talks
 * straight to the Drive API v3 (folders/files) and Sheets API v4 (rows).
 *
 * DRIVE STRUCTURE (all auto-created; mirrors the old Supabase tables):
 *
 *   Productivity-Shastra-Data/                ← root folder (app-created)
 *   ├─ _System                                ← spreadsheet: users + _meta tabs
 *   └─ "<Name> — <email>"/                    ← ONE FOLDER PER USER (on signup)
 *      ├─ Time Auditor                        ← spreadsheet: entries, challenges
 *      ├─ Time Finder                         ← spreadsheet: assessments
 *      ├─ Meeting                             ← spreadsheet: meetings
 *      ├─ Power Planner                       ← spreadsheet: weeks, reviews, settings
 *      └─ Reasons Eliminator                  ← spreadsheet: sessions, grip_tests, grip_history
 *
 * Row 1 of every tab = headers mirroring the old Postgres columns (no user_id
 * — the folder IS the user scope). Cells are JSON-encoded so types round-trip.
 * Folder/spreadsheet ids are cached in the _meta tab (and in memory) so Drive
 * isn't searched on every request.
 *
 * DEMO-GRADE BY DESIGN: everything runs in the browser under ONE Google
 * account's Drive (whoever signs in to the consent popup — needs the Sheets +
 * Drive scopes; uses the same OAuth client as the Calendar export). App-level
 * login is checked client-side against the users tab. Fine for a demo, never
 * for production.
 *
 * Setup (frontend/.env): just VITE_GOOGLE_CLIENT_ID (already set for
 * Calendar). Enable "Google Sheets API" + "Google Drive API" in the same
 * Cloud project. No spreadsheet/folder ids to copy — everything auto-creates.
 *
 * Timing logs (Supabase comparison): every Google API call logs
 * `[gs-api] read ta_entries … 412ms`; run  window.apiTimings()  in the
 * console for a console.table of every call this session.
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const isConfigured = Boolean(GOOGLE_CLIENT_ID);

const ROOT_NAME = 'Productivity-Shastra-Data';
const SYSTEM_NAME = '_System';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

// ── Schema: logical table → { tool spreadsheet, tab, headers, keys } ─────────
// keys = the columns an upsert matches on. idCol = what deleteRows ids mean.
//
// Each row keeps the COMPLETE record in its JSON column (entry / assessment /
// meeting / data / reasons — same as Supabase's jsonb columns, nothing is
// lost) PLUS human-readable summary columns (title, date, status, counts…)
// that are auto-derived from the JSON on every save, so the spreadsheet is
// pleasant to read. `derived` lists those columns; `derive(row)` fills them.
const txt = (v) => (v == null ? null : typeof v === 'string' ? v : String(v));
const count = (v) => (Array.isArray(v) ? v.length : 0);
const top3Text = (list) =>
  Array.isArray(list)
    ? list
        .map((t) => (typeof t === 'string' ? t : t?.task || t?.title || t?.text || ''))
        .filter(Boolean)
        .join(' | ') || null
    : null;

export const SHEET_DEFS = {
  // _System spreadsheet (shared registry)
  users: {
    system: true, tab: 'users', keys: ['id'], idCol: 'id',
    headers: ['id', 'name', 'email', 'phone', 'country', 'role', 'status', 'title', 'department', 'timezone', 'avatar', 'preferences', 'password_hash', 'salt', 'created_at'],
  },
  _meta: { system: true, tab: '_meta', keys: ['key'], idCol: 'key', headers: ['key', 'value'] },
  // Per-user tool spreadsheets
  ta_entries: {
    file: 'Time Auditor', tab: 'entries', keys: ['id'], idCol: 'id',
    headers: ['id', 'date', 'start_time', 'slots_count', 'productivity_pct', 'top3', 'entry', 'created_at'],
    derived: ['date', 'start_time', 'slots_count', 'productivity_pct', 'top3'],
    derive: (r) => ({
      date: txt(r.entry?.date),
      start_time: txt(r.entry?.startTime),
      slots_count: count(r.entry?.slots),
      productivity_pct: r.entry?.stats?.productivityPct ?? null,
      top3: top3Text(r.entry?.top3),
    }),
  },
  ta_challenges: { file: 'Time Auditor', tab: 'challenges', keys: ['id'], idCol: 'id', headers: ['id', 'days', 'status', 'started_at', 'completed_at', 'created_at'] },
  tf_assessments: {
    file: 'Time Finder', tab: 'assessments', keys: ['id'], idCol: 'id',
    headers: ['id', 'title', 'routines_count', 'total_time_saved', 'archived', 'assessment', 'created_at'],
    derived: ['title', 'routines_count', 'total_time_saved'],
    derive: (r) => ({
      title: txt(r.assessment?.title),
      routines_count: count(r.assessment?.routines),
      total_time_saved: r.assessment?.totalTimeSaved ?? null,
    }),
  },
  meetings: {
    file: 'Meeting', tab: 'meetings', keys: ['id'], idCol: 'id',
    headers: ['id', 'title', 'status', 'est_time', 'experience', 'archived', 'meeting', 'created_at', 'updated_at'],
    derived: ['title', 'status', 'est_time', 'experience', 'archived'],
    derive: (r) => ({
      title: txt(r.meeting?.title),
      status: txt(r.meeting?.status),
      est_time: r.meeting?.estTime ?? null,
      experience: r.meeting?.experience ?? null,
      archived: !!r.meeting?.archived,
    }),
  },
  pp_weeks: {
    file: 'Power Planner', tab: 'weeks', keys: ['week_start'], idCol: 'week_start',
    headers: ['week_start', 'commitments_count', 'actions_count', 'data', 'updated_at'],
    derived: ['commitments_count', 'actions_count'],
    derive: (r) => ({
      commitments_count: count(r.data?.commitments),
      actions_count: count(r.data?.actions),
    }),
  },
  pp_reviews: { file: 'Power Planner', tab: 'reviews', keys: ['week_start'], idCol: 'week_start', headers: ['week_start', 'completion_pct', 'productivity_score', 'total_commitments', 'planned_hours', 'delegated_count', 'insights', 'updated_at'] },
  pp_settings: { file: 'Power Planner', tab: 'settings', keys: ['id'], idCol: 'id', headers: ['id', 'start_date', 'schedule', 'custom_options', 'gcal_event_ids', 'updated_at'] },
  re_sessions: {
    file: 'Reasons Eliminator', tab: 'sessions', keys: ['id'], idCol: 'id',
    headers: ['id', 'status', 'source', 'week_start', 'reasons_count', 'reasons_preview', 'reasons', 'created_at', 'updated_at'],
    derived: ['reasons_count', 'reasons_preview'],
    derive: (r) => ({
      reasons_count: count(r.reasons),
      reasons_preview: Array.isArray(r.reasons)
        ? r.reasons.slice(0, 3).map((x) => txt(x?.text) || '').filter(Boolean).join(' | ') || null
        : null,
    }),
  },
  re_grip_tests: { file: 'Reasons Eliminator', tab: 'grip_tests', keys: ['reason_id'], idCol: 'reason_id', headers: ['reason_id', 'session_id', 'seq', 'reason_text', 'reason_date', 'score', 'status', 'updated_at'] },
  re_grip_history: {
    file: 'Reasons Eliminator', tab: 'grip_history', keys: ['id'], idCol: 'id',
    headers: ['id', 'run_date', 'month', 'entries_count', 'archived', 'entries', 'updated_at'],
    derived: ['entries_count'],
    derive: (r) => ({ entries_count: count(r.entries) }),
  },
};

// Tool spreadsheet name → its tabs (so a tool file is created whole).
const TOOL_FILES = {};
Object.values(SHEET_DEFS).forEach((def) => {
  if (!def.file) return;
  (TOOL_FILES[def.file] = TOOL_FILES[def.file] || []).push(def);
});

// ── App session (sessionStorage: F5 keeps login, fresh launch doesn't) ───────
const SESSION_KEY = 'gs.session'; // { token, user }
let listeners = [];

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token || null;
}

function emit(event, session) {
  listeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch {
      /* a bad listener must not break auth */
    }
  });
}

export function setSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
  emit('SIGNED_IN', session);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  emit('SIGNED_OUT', null);
}

export function patchSessionUser(user) {
  const s = getSession();
  if (!s) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, user }));
  } catch {
    /* ignore */
  }
}

/** Subscribe to SIGNED_IN / SIGNED_OUT. Returns an unsubscribe function. */
export function onAuthChange(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function currentUser() {
  const u = getSession()?.user;
  if (!u?.id) throw new ApiError('Not signed in.', 'AUTH_REQUIRED');
  return u;
}

// ── Errors / ids / hashing ───────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** SHA-256 hex (Web Crypto) — for salted password hashes in the users tab. */
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Timing log ───────────────────────────────────────────────────────────────
const timings = [];

function logTiming(entry) {
  timings.push(entry);
  // eslint-disable-next-line no-console
  console.log(
    `%c[gs-api]%c ${entry.op} … ${entry.ms}ms${entry.ok ? '' : ' ✗ FAILED'}`,
    'color:#0a7d32;font-weight:bold',
    entry.ok ? '' : 'color:#c00'
  );
}

if (typeof window !== 'undefined') {
  window.apiTimings = () => {
    // eslint-disable-next-line no-console
    console.table(timings);
    return `${timings.length} request(s) this session`;
  };
}

// Surface Google save/auth failures to the UI instead of swallowing them.
// A listener (components/GsErrorToaster) turns these into an on-screen toast,
// so a user never sees a silent "nothing happened" when a save fails.
let lastErrEmit = 0;
function emitError(message) {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastErrEmit < 3000) return; // throttle bursts from a single action
  lastErrEmit = now;
  try {
    window.dispatchEvent(new CustomEvent('gs:error', { detail: String(message) }));
  } catch {
    /* ignore */
  }
}

// ── Google access token (GIS popup — same pattern as the Calendar export) ───
const GTOKEN_KEY = 'gs.gtoken'; // { token, exp }
let gisPromise = null;

const loadGis = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in."));
    document.head.appendChild(s);
  });
  return gisPromise;
};

function storedGToken() {
  try {
    const raw = sessionStorage.getItem(GTOKEN_KEY);
    const t = raw ? JSON.parse(raw) : null;
    return t && t.exp > Date.now() + 60000 ? t.token : null;
  } catch {
    return null;
  }
}

/**
 * A valid Google access token (~1h). interactive:false never opens a popup —
 * callers without a user gesture (the AuthContext bootstrap) use it so popup
 * blockers can't strand them; the next clicked action re-opens the popup.
 */
export async function ensureGoogleToken({ interactive = true } = {}) {
  const stored = storedGToken();
  if (stored) return stored;
  if (!interactive) {
    throw new ApiError('Google session expired — the next click will re-open the sign-in popup.', 'GOOGLE_TOKEN');
  }
  await loadGis();
  const token = await new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp?.access_token) resolve(resp);
          else reject(new ApiError(resp?.error_description || 'Google sign-in failed.', 'GOOGLE_TOKEN'));
        },
        error_callback: (err) =>
          reject(new ApiError(err?.message || 'Google sign-in was cancelled.', 'GOOGLE_TOKEN')),
      });
      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
  try {
    sessionStorage.setItem(
      GTOKEN_KEY,
      JSON.stringify({ token: token.access_token, exp: Date.now() + (Number(token.expires_in || 3600) - 60) * 1000 })
    );
  } catch {
    /* ignore */
  }
  return token.access_token;
}

// ── Raw fetch to Google APIs (timing + retry + token refresh) ────────────────
const RETRYABLE = /quota|rate.?limit|too many/i;

async function gfetch(op, url, { method = 'GET', body, interactive = true } = {}) {
  if (!isConfigured) {
    throw new ApiError('Backend not configured — set VITE_GOOGLE_CLIENT_ID in frontend/.env', 'NOT_CONFIGURED');
  }
  const t0 = performance.now();
  let lastErr = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 900 * 2 ** (attempt - 1)));
    try {
      const token = await ensureGoogleToken({ interactive });
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) {
        sessionStorage.removeItem(GTOKEN_KEY); // expired/revoked — re-auth and retry
        lastErr = new ApiError('Google token expired.', 'GOOGLE_TOKEN', 401);
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || `Google API HTTP ${res.status}`;
        const err = new ApiError(msg, data?.error?.status || 'GOOGLE_API', res.status);
        if ((res.status === 429 || res.status === 503 || RETRYABLE.test(msg)) && attempt < 2) {
          lastErr = err;
          continue;
        }
        logTiming({ op, ms: Math.round(performance.now() - t0), ok: false, at: new Date().toLocaleTimeString() });
        throw err;
      }
      logTiming({ op, ms: Math.round(performance.now() - t0), ok: true, at: new Date().toLocaleTimeString() });
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GOOGLE_TOKEN' && err.status !== 401) {
        logTiming({ op, ms: Math.round(performance.now() - t0), ok: false, at: new Date().toLocaleTimeString() });
        emitError(
          'Google access is needed to save your data into Sheets. When the popup opens, pick your Google account → Advanced → Continue → Allow.'
        );
        throw err; // sign-in cancelled / silent mode — don't burn retries
      }
      lastErr = err;
    }
  }
  logTiming({ op, ms: Math.round(performance.now() - t0), ok: false, at: new Date().toLocaleTimeString() });
  const finalErr =
    lastErr instanceof ApiError ? lastErr : new ApiError(lastErr?.message || 'Could not reach Google.', 'NETWORK');
  emitError(`Couldn't save to Google Sheets: ${finalErr.message}`);
  throw finalErr;
}

// ── Drive helpers ────────────────────────────────────────────────────────────
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet';

async function driveFind(q, opts) {
  const res = await gfetch('drive search', `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`, opts);
  return res.files?.[0]?.id || null;
}

async function driveCreate(name, mimeType, parentId, opts) {
  const res = await gfetch(`drive create ${name}`, `${DRIVE_API}?fields=id`, {
    ...opts,
    method: 'POST',
    body: { name, mimeType, ...(parentId ? { parents: [parentId] } : {}) },
  });
  return res.id;
}

const esc = (s) => String(s).replace(/'/g, "\\'");

// Does this Drive id still exist (and isn't in the trash)? Lets the bootstrap
// self-heal when the user deletes Productivity-Shastra-Data to start fresh.
async function driveAlive(id, opts) {
  try {
    const res = await gfetch('drive verify', `${DRIVE_API}/${id}?fields=trashed`, opts);
    return res?.trashed !== true;
  } catch {
    return false;
  }
}

// ── Cell encode/decode: every data cell is JSON so types round-trip ─────────
const enc = (v) => (v === undefined || v === null ? '' : JSON.stringify(v));

// Derived (display-only) string columns are written WITHOUT JSON quotes so the
// spreadsheet reads naturally; decode falls back to the raw string anyway.
const encFor = (def, h, v) => (def.derived?.includes(h) && typeof v === 'string' ? v : enc(v));
const dec = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  try {
    return JSON.parse(String(v));
  } catch {
    return String(v); // hand-edited cell — keep as raw string
  }
};

const colLetter = (n) => {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// ── Low-level Sheets ops on a known spreadsheet id ───────────────────────────
const tabIdCache = {}; // ssId → { tabTitle: numericSheetId }

async function tabIds(ssId, opts) {
  if (!tabIdCache[ssId]) {
    const meta = await gfetch('meta spreadsheet', `${SHEETS_API}/${ssId}?fields=sheets.properties(sheetId,title)`, opts);
    const map = {};
    (meta.sheets || []).forEach((s) => {
      map[s.properties.title] = s.properties.sheetId;
    });
    tabIdCache[ssId] = map;
  }
  return tabIdCache[ssId];
}

async function readTab(ssId, def, opts) {
  const last = colLetter(def.headers.length);
  const res = await gfetch(
    `read ${def.tab}`,
    `${SHEETS_API}/${ssId}/values/${encodeURIComponent(`'${def.tab}'!A2:${last}`)}`,
    opts
  );
  return (res.values || [])
    .map((cells, i) => {
      const obj = { _row: i + 2 };
      let empty = true;
      def.headers.forEach((h, c) => {
        const v = dec(cells[c]);
        obj[h] = v;
        if (v !== null) empty = false;
      });
      return empty ? null : obj;
    })
    .filter(Boolean);
}

// Create a spreadsheet with the given tabs (+ header rows), drop default Sheet1.
async function createToolSpreadsheet(name, defs, parentId, opts) {
  const ssId = await driveCreate(name, SHEET_MIME, parentId, opts);
  const existing = await tabIds(ssId, opts); // the default tab's real sheetId
  const defaultId = Object.values(existing)[0];
  const res = await gfetch(`init ${name}`, `${SHEETS_API}/${ssId}:batchUpdate`, {
    ...opts,
    method: 'POST',
    body: {
      requests: [
        ...defs.map((d) => ({
          addSheet: { properties: { title: d.tab, gridProperties: { frozenRowCount: 1 } } },
        })),
        ...(defaultId !== undefined ? [{ deleteSheet: { sheetId: defaultId } }] : []),
      ],
    },
  });
  const map = {};
  (res.replies || []).forEach((r) => {
    if (r.addSheet) map[r.addSheet.properties.title] = r.addSheet.properties.sheetId;
  });
  tabIdCache[ssId] = map;
  await gfetch(`headers ${name}`, `${SHEETS_API}/${ssId}/values:batchUpdate`, {
    ...opts,
    method: 'POST',
    body: {
      valueInputOption: 'RAW',
      data: defs.map((d) => ({ range: `'${d.tab}'!A1`, values: [d.headers] })),
    },
  });
  return ssId;
}

// ── Bootstrap: root folder + _System spreadsheet + _meta id cache ────────────
let rootP = null;
let systemP = null;
let metaP = null; // Map(key → { value, _row })

async function ensureRoot(opts) {
  if (!rootP) {
    rootP = (async () => {
      const cached = localStorage.getItem('gs.rootId');
      if (cached && (await driveAlive(cached, opts))) return cached;
      // Cached folder was deleted (fresh-start reset) — drop ALL cached ids,
      // everything under it is gone too.
      localStorage.removeItem('gs.rootId');
      localStorage.removeItem('gs.systemId');
      let id = await driveFind(`name='${esc(ROOT_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false`, opts);
      if (!id) id = await driveCreate(ROOT_NAME, FOLDER_MIME, null, opts);
      localStorage.setItem('gs.rootId', id);
      return id;
    })().catch((e) => {
      rootP = null;
      throw e;
    });
  }
  return rootP;
}

async function ensureSystem(opts) {
  if (!systemP) {
    systemP = (async () => {
      const rootId = await ensureRoot(opts); // also invalidates a stale system id
      const cached = localStorage.getItem('gs.systemId');
      if (cached && (await driveAlive(cached, opts))) return cached;
      localStorage.removeItem('gs.systemId');
      let id = await driveFind(
        `name='${esc(SYSTEM_NAME)}' and '${rootId}' in parents and mimeType='${SHEET_MIME}' and trashed=false`,
        opts
      );
      // Auth moved to Supabase — _System now holds ONLY the _meta id cache
      // (the users tab is obsolete and no longer created).
      if (!id) id = await createToolSpreadsheet(SYSTEM_NAME, [SHEET_DEFS._meta], rootId, opts);
      localStorage.setItem('gs.systemId', id);
      return id;
    })().catch((e) => {
      systemP = null;
      throw e;
    });
  }
  return systemP;
}

/** Bootstrap everything needed before auth/data calls. Safe to call often. */
export async function ensureReady(opts = {}) {
  await ensureGoogleToken(opts);
  await ensureSystem(opts);
}

async function metaMap(opts) {
  if (!metaP) {
    metaP = (async () => {
      const ssId = await ensureSystem(opts);
      const rows = await readTab(ssId, SHEET_DEFS._meta, opts);
      return new Map(rows.map((r) => [r.key, { value: r.value, _row: r._row }]));
    })().catch((e) => {
      metaP = null;
      throw e;
    });
  }
  return metaP;
}

async function metaGet(key, opts) {
  return (await metaMap(opts)).get(key)?.value || null;
}

async function metaSet(key, value, opts) {
  const ssId = await ensureSystem(opts);
  const map = await metaMap(opts);
  const hit = map.get(key);
  if (hit) {
    await gfetch(`meta set ${key}`, `${SHEETS_API}/${ssId}/values/${encodeURIComponent(`'_meta'!A${hit._row}:B${hit._row}`)}?valueInputOption=RAW`, {
      ...opts,
      method: 'PUT',
      body: { values: [[enc(key), enc(value)]] },
    });
    hit.value = value;
  } else {
    const res = await gfetch(`meta add ${key}`, `${SHEETS_API}/${ssId}/values/${encodeURIComponent("'_meta'!A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      ...opts,
      method: 'POST',
      body: { values: [[enc(key), enc(value)]] },
    });
    const m = /![A-Z]+(\d+):/.exec(res?.updates?.updatedRange || '');
    map.set(key, { value, _row: m ? Number(m[1]) : -1 });
  }
}

// ── Per-user folder + tool spreadsheets ──────────────────────────────────────
async function ensureUserFolder(user, opts) {
  const key = `folder:${user.id}`;
  let id = await metaGet(key, opts);
  if (id) return id;
  const rootId = await ensureRoot(opts);
  id = await driveCreate(`${user.name || 'User'} — ${user.email}`, FOLDER_MIME, rootId, opts);
  await metaSet(key, id, opts);
  return id;
}

async function ensureToolSS(user, file, opts) {
  const key = `ss:${user.id}:${file}`;
  let id = await metaGet(key, opts);
  if (id) return id;
  const folderId = await ensureUserFolder(user, opts);
  id = await createToolSpreadsheet(file, TOOL_FILES[file], folderId, opts);
  await metaSet(key, id, opts);
  return id;
}

/** Has this user's tool spreadsheet ever been created? (no Drive calls) */
async function peekToolSS(userId, file, opts) {
  return metaGet(`ss:${userId}:${file}`, opts);
}

/**
 * Create the user's folder + ALL five tool spreadsheets. Called at SIGNUP so
 * the structure visibly appears in Drive the moment an account exists.
 */
export async function provisionUserDrive(user) {
  await ensureUserFolder(user);
  for (const file of Object.keys(TOOL_FILES)) {
    await ensureToolSS(user, file);
  }
}

// ── Resolve a logical sheet name → { ssId, def } for the current user ───────
async function resolve(name, { user, interactive = true, autoCreate = true } = {}) {
  const def = SHEET_DEFS[name];
  if (!def) throw new ApiError(`Unknown sheet "${name}".`, 'BAD_REQUEST');
  const opts = { interactive };
  if (def.system) return { ssId: await ensureSystem(opts), def };
  const u = user || currentUser();
  if (!autoCreate) {
    const id = await peekToolSS(u.id, def.file, opts);
    return { ssId: id, def };
  }
  return { ssId: await ensureToolSS(u, def.file, opts), def };
}

const strip = ({ _row, ...rest }) => rest;

// ── Public data layer (the verbs the services use) ───────────────────────────

/** All rows of the signed-in user's sheet (or a system sheet like 'users'). */
export async function listRows(name, { interactive = true } = {}) {
  const { ssId, def } = await resolve(name, { interactive, autoCreate: false });
  if (!ssId) return []; // tool spreadsheet not created yet → no data
  return (await readTab(ssId, def, { interactive })).map(strip);
}

/** Same, but for ANY user (leaderboard aggregation). Returns [] if none. */
export async function listRowsForUser(name, user) {
  const { ssId, def } = await resolve(name, { user, autoCreate: false });
  if (!ssId) return [];
  return (await readTab(ssId, def)).map(strip);
}

/**
 * Insert-or-MERGE rows by the sheet's key columns (created_at/updated_at
 * default on insert). Returns the resulting full rows.
 */
export async function upsertRows(name, rows) {
  if (!rows?.length) return [];
  const { ssId, def } = await resolve(name);
  const existing = await readTab(ssId, def);
  const keyOf = (r) => def.keys.map((k) => String(r[k])).join(' ');
  const byKey = new Map(existing.map((r) => [keyOf(r), r]));

  const updates = [];
  const appends = [];
  const results = [];
  const now = new Date().toISOString();
  const last = colLetter(def.headers.length);

  rows.forEach((row) => {
    const hit = byKey.get(keyOf(row));
    if (hit) {
      const merged = {};
      def.headers.forEach((h) => {
        merged[h] = row[h] !== undefined ? row[h] : hit[h];
      });
      if (def.derive) Object.assign(merged, def.derive(merged)); // keep summary columns in sync with the JSON
      updates.push({ range: `'${def.tab}'!A${hit._row}:${last}${hit._row}`, values: [def.headers.map((h) => encFor(def, h, merged[h]))] });
      results.push(merged);
    } else {
      const fresh = {};
      def.headers.forEach((h) => {
        if (row[h] !== undefined) fresh[h] = row[h];
        else if (h === 'created_at' || h === 'updated_at') fresh[h] = now;
        else fresh[h] = null;
      });
      if (def.derive) Object.assign(fresh, def.derive(fresh));
      appends.push(def.headers.map((h) => encFor(def, h, fresh[h])));
      results.push(fresh);
    }
  });

  if (updates.length) {
    await gfetch(`update ${name} ×${updates.length}`, `${SHEETS_API}/${ssId}/values:batchUpdate`, {
      method: 'POST',
      body: { valueInputOption: 'RAW', data: updates },
    });
  }
  if (appends.length) {
    await gfetch(
      `append ${name} ×${appends.length}`,
      `${SHEETS_API}/${ssId}/values/${encodeURIComponent(`'${def.tab}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: { values: appends } }
    );
  }
  return results;
}

async function deleteRowNumbers(ssId, def, rowNumbers) {
  if (!rowNumbers.length) return 0;
  const ids = await tabIds(ssId);
  await gfetch(`delete ${def.tab} ×${rowNumbers.length}`, `${SHEETS_API}/${ssId}:batchUpdate`, {
    method: 'POST',
    body: {
      requests: rowNumbers
        .sort((a, b) => b - a) // bottom-up so indexes stay valid
        .map((r) => ({
          deleteDimension: { range: { sheetId: ids[def.tab], dimension: 'ROWS', startIndex: r - 1, endIndex: r } },
        })),
    },
  });
  return rowNumbers.length;
}

/** Delete the user's rows whose idCol matches one of `ids`. */
export async function deleteRows(name, ids) {
  if (!ids?.length) return { deleted: 0 };
  const { ssId, def } = await resolve(name, { autoCreate: false });
  if (!ssId) return { deleted: 0 };
  const wanted = ids.map(String);
  const rows = (await readTab(ssId, def)).filter((r) => wanted.includes(String(r[def.idCol])));
  return { deleted: await deleteRowNumbers(ssId, def, rows.map((r) => r._row)) };
}

/** Delete ALL the user's rows in a sheet (optionally only those matching `where`). */
export async function clearRows(name, where = null) {
  const { ssId, def } = await resolve(name, { autoCreate: false });
  if (!ssId) return { deleted: 0 };
  const rows = (await readTab(ssId, def)).filter((r) => {
    if (!where) return true;
    return Object.keys(where).every((k) => {
      const a = r[k] === null ? false : r[k]; // null and false both mean "not archived"
      const b = where[k] === null ? false : where[k];
      return JSON.stringify(a) === JSON.stringify(b);
    });
  });
  return { deleted: await deleteRowNumbers(ssId, def, rows.map((r) => r._row)) };
}
