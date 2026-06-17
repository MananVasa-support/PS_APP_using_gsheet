/**
 * ============================================================================
 * Productivity Shastra — TOOL DATA server (Google Apps Script Web App)
 * ============================================================================
 * AUTH is on Supabase (this script does NOT do auth). This web app is the
 * reliable, server-side store for all TOOL DATA in Google Sheets.
 *
 * STRUCTURE: ONE spreadsheet PER USER, named "<Name>_<short-id>", inside a
 * Main Folder. Inside each user's spreadsheet, one TAB per tool data set:
 *   Main Folder
 *     ├─ _System                 (registry: userId → spreadsheetId, in _meta)
 *     └─ "a1b2c3d4" (one spreadsheet per user)
 *          ├─ ta_entries         (Time Auditor assessments)
 *          ├─ ta_challenges      (Time Auditor Level-2 runs)
 *          ├─ tf_assessments     (Time Finder)
 *          ├─ meetings           (Meeting Success Maximizer)
 *          ├─ pp_weeks / pp_reviews / pp_settings  (Power Planner)
 *          └─ re_sessions / re_grip_tests / re_grip_history  (Reasons Eliminator)
 *
 * The browser POSTs each request with the signed-in user's Supabase id; the
 * script resolves (or creates) that user's spreadsheet and reads/writes the
 * right tab. No per-user Google popup → reliable, cross-device, multi-user.
 *
 * DEPLOY (with the INTERN Google account):
 *   1. script.google.com → New project → paste this whole file.
 *   2. (Optional) set ROOT_FOLDER_ID to an existing Drive folder; leave '' to
 *      auto-create "Productivity-Shastra-Data".
 *   3. Deploy → New deployment → Web app → Execute as: Me · Access: Anyone →
 *      Deploy → authorize → copy the /exec URL → frontend VITE_API_BASE_URL.
 *   4. After ANY edit: Deploy → Manage deployments → edit → New version.
 *
 * API (POST JSON, Content-Type text/plain):
 *   { route, userId, userName, userEmail, sheet, rows|ids|where }
 *   /provision /list /upsert /delete /clear /leaderboard
 * Response: { ok:true, data, ms } | { ok:false, error:{message,code}, ms }
 * ============================================================================
 */

const ROOT_FOLDER_ID = ''; // '' = auto-create the Main Folder
const ROOT_NAME = 'Productivity-Shastra-Data';
const SYSTEM_NAME = '_System';

// ── Schema: logical sheet → TAB (one spreadsheet per user holds all tabs) ────
// `derived` columns are auto-filled from the JSON so the sheet reads cleanly;
// `keys` is what /upsert merges on; `idCol` is what /delete matches.
const DEFS = {
  ta_entries: { tab: 'ta_entries', keys: ['id'], idCol: 'id',
    headers: ['id', 'date', 'start_time', 'slots_count', 'productivity_pct', 'top3', 'entry', 'created_at'],
    derived: ['date', 'start_time', 'slots_count', 'productivity_pct', 'top3'] },
  ta_challenges: { tab: 'ta_challenges', keys: ['id'], idCol: 'id',
    headers: ['id', 'days', 'status', 'started_at', 'completed_at', 'created_at'] },
  tf_assessments: { tab: 'tf_assessments', keys: ['id'], idCol: 'id',
    headers: ['id', 'title', 'routines_count', 'total_time_saved', 'archived', 'assessment', 'created_at'],
    derived: ['title', 'routines_count', 'total_time_saved'] },
  meetings: { tab: 'meetings', keys: ['id'], idCol: 'id',
    headers: ['id', 'title', 'status', 'est_time', 'experience', 'archived', 'meeting', 'created_at', 'updated_at'],
    derived: ['title', 'status', 'est_time', 'experience', 'archived'] },
  pp_weeks: { tab: 'pp_weeks', keys: ['week_start'], idCol: 'week_start',
    headers: ['week_start', 'commitments_count', 'actions_count', 'data', 'updated_at'],
    derived: ['commitments_count', 'actions_count'] },
  pp_reviews: { tab: 'pp_reviews', keys: ['week_start'], idCol: 'week_start',
    headers: ['week_start', 'completion_pct', 'productivity_score', 'total_commitments', 'planned_hours', 'delegated_count', 'insights', 'updated_at'] },
  pp_settings: { tab: 'pp_settings', keys: ['id'], idCol: 'id',
    headers: ['id', 'start_date', 'schedule', 'custom_options', 'gcal_event_ids', 'updated_at'] },
  re_sessions: { tab: 're_sessions', keys: ['id'], idCol: 'id',
    headers: ['id', 'status', 'source', 'week_start', 'reasons_count', 'reasons_preview', 'reasons', 'created_at', 'updated_at'],
    derived: ['reasons_count', 'reasons_preview'] },
  re_grip_tests: { tab: 're_grip_tests', keys: ['reason_id'], idCol: 'reason_id',
    headers: ['reason_id', 'session_id', 'seq', 'reason_text', 'reason_date', 'score', 'status', 'updated_at'] },
  re_grip_history: { tab: 're_grip_history', keys: ['id'], idCol: 'id',
    headers: ['id', 'run_date', 'month', 'entries_count', 'archived', 'entries', 'updated_at'],
    derived: ['entries_count'] },
  // Totality (Pre PS) task capture. All fields are simple scalars stored as
  // readable plain text (derived), so the sheet is human-legible; the frontend
  // sends a full row each time, so a partial-merge is never needed.
  totality_tasks: { tab: 'totality_tasks', keys: ['id'], idCol: 'id',
    headers: ['id', 'subject', 'thing_to_get_done', 'frequency', 'priority', 'target_date', 'doer', 'notes', 'schedule', 'moved_to_week', 'status', 'created_at', 'updated_at'],
    derived: ['subject', 'thing_to_get_done', 'frequency', 'priority', 'target_date', 'doer', 'notes', 'schedule', 'moved_to_week', 'status'] },
  // Singleton (id='options') holding the auto-add Subject / Doer option lists.
  totality_meta: { tab: 'totality_meta', keys: ['id'], idCol: 'id',
    headers: ['id', 'subjects', 'doers', 'updated_at'] },
};
const ALL_SHEETS = Object.keys(DEFS);

function deriveRow(name, row) {
  var d = DEFS[name];
  if (!d.derived) return row;
  var n = function (v) { return Array.isArray(v) ? v.length : 0; };
  if (name === 'ta_entries') {
    var e = row.entry || {};
    row.date = e.date || null; row.start_time = e.startTime || null; row.slots_count = n(e.slots);
    row.productivity_pct = (e.stats && e.stats.productivityPct) != null ? e.stats.productivityPct : null;
    row.top3 = Array.isArray(e.top3) ? e.top3.map(function (t) { return typeof t === 'string' ? t : (t && (t.task || t.title || t.text)) || ''; }).filter(String).join(' | ') || null : null;
  } else if (name === 'tf_assessments') {
    var a = row.assessment || {};
    row.title = a.title || null; row.routines_count = n(a.routines); row.total_time_saved = a.totalTimeSaved != null ? a.totalTimeSaved : null;
  } else if (name === 'meetings') {
    var m = row.meeting || {};
    row.title = m.title || null; row.status = m.status || null; row.est_time = m.estTime != null ? m.estTime : null;
    row.experience = m.experience != null ? m.experience : null; row.archived = !!m.archived;
  } else if (name === 'pp_weeks') {
    var w = row.data || {};
    row.commitments_count = n(w.commitments); row.actions_count = n(w.actions);
  } else if (name === 're_sessions') {
    var rs = Array.isArray(row.reasons) ? row.reasons : [];
    row.reasons_count = rs.length;
    row.reasons_preview = rs.slice(0, 3).map(function (x) { return (x && x.text) || ''; }).filter(String).join(' | ') || null;
  } else if (name === 're_grip_history') {
    row.entries_count = n(row.entries);
  }
  return row;
}

// ── Entry points ─────────────────────────────────────────────────────────────
function doGet() {
  return jsonOut({ ok: true, service: 'productivity-shastra-data', time: new Date().toISOString() });
}

function doPost(e) {
  var t0 = Date.now();
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut({ ok: false, error: { message: 'Invalid JSON body.', code: 'BAD_JSON' }, ms: Date.now() - t0 });
  }
  try {
    var data = route(body);
    return jsonOut({ ok: true, data: data === undefined ? null : data, ms: Date.now() - t0 });
  } catch (err) {
    return jsonOut({ ok: false, error: { message: (err && err.message) || 'Server error.', code: (err && err.code) || 'SERVER_ERROR' }, ms: Date.now() - t0 });
  }
}

function route(body) {
  switch (String(body.route || '')) {
    case '/provision': return provisionRoute(body);
    case '/list': return listRoute(body);
    case '/upsert': return upsertRoute(body);
    case '/delete': return deleteRoute(body);
    case '/clear': return clearRoute(body);
    case '/leaderboard': return leaderboardRoute(body);
    default: throw apiError('Unknown route: ' + body.route, 'NOT_FOUND');
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function jsonOut(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function apiError(m, c) { var e = new Error(m); e.code = c || 'BAD_REQUEST'; return e; }
function nowIso() { return new Date().toISOString(); }
function cache() { return CacheService.getScriptCache(); }
function withLock(fn) { var l = LockService.getScriptLock(); l.waitLock(30000); try { return fn(); } finally { l.releaseLock(); } }

function userOf(body) {
  var id = String(body.userId || '');
  if (!id) throw apiError('Missing userId.', 'AUTH_REQUIRED');
  return { id: id, name: String(body.userName || ''), email: String(body.userEmail || '') };
}
function defOf(name) { var d = DEFS[name]; if (!d) throw apiError('Unknown sheet: ' + name, 'BAD_REQUEST'); return d; }
function sanitize(s) { return String(s || '').replace(/[\\\/:*?"<>|\[\]]+/g, ' ').trim().replace(/\s+/g, '_') || 'User'; }

// Every cell is JSON-encoded so types round-trip; derived strings unquoted.
function enc(v) { return (v === undefined || v === null) ? '' : JSON.stringify(v); }
function encFor(def, h, v) { return (def.derived && def.derived.indexOf(h) !== -1 && typeof v === 'string') ? v : enc(v); }
function dec(v) { if (v === '' || v === null || v === undefined) return null; try { return JSON.parse(String(v)); } catch (e) { return String(v); } }
function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// Open a cached id ONLY if it still exists and is NOT trashed. Drive "delete"
// only trashes files, and Apps Script can still open trashed items — so without
// this guard a deleted folder/spreadsheet would be silently reused. Returns null
// when the id is gone/trashed, so callers recreate cleanly.
function aliveFolder(id) {
  try { var f = DriveApp.getFolderById(id); return f.isTrashed() ? null : f; } catch (e) { return null; }
}
function aliveSS(id) {
  try { if (DriveApp.getFileById(id).isTrashed()) return null; return SpreadsheetApp.openById(id); } catch (e) { return null; }
}

// ── Main folder + _System registry ──────────────────────────────────────────
function mainFolder() {
  if (ROOT_FOLDER_ID) return DriveApp.getFolderById(ROOT_FOLDER_ID);
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('root_id');
  if (cached) { var fa = aliveFolder(cached); if (fa) return fa; }
  return withLock(function () {
    var again = PropertiesService.getScriptProperties().getProperty('root_id');
    if (again) { var fb = aliveFolder(again); if (fb) return fb; }
    var it = DriveApp.getFoldersByName(ROOT_NAME);
    var f = null;
    while (it.hasNext()) { var c = it.next(); if (!c.isTrashed()) { f = c; break; } }
    if (!f) f = DriveApp.createFolder(ROOT_NAME);
    PropertiesService.getScriptProperties().setProperty('root_id', f.getId());
    return f;
  });
}

function systemSS() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('system_id');
  if (cached) { var sa = aliveSS(cached); if (sa) return sa; }
  return withLock(function () {
    var again = PropertiesService.getScriptProperties().getProperty('system_id');
    if (again) { var sb = aliveSS(again); if (sb) return sb; }
    var root = mainFolder();
    var ss = null;
    var ex = root.getFilesByName(SYSTEM_NAME);
    while (ex.hasNext()) { var f0 = ex.next(); if (!f0.isTrashed()) { ss = SpreadsheetApp.openById(f0.getId()); break; } }
    if (!ss) { ss = SpreadsheetApp.create(SYSTEM_NAME); DriveApp.getFileById(ss.getId()).moveTo(root); }
    var meta = ss.getSheetByName('_meta') || ss.insertSheet('_meta');
    if (meta.getLastRow() < 1) meta.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
    var def = ss.getSheetByName('Sheet1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
    PropertiesService.getScriptProperties().setProperty('system_id', ss.getId());
    return ss;
  });
}

function metaSheet() { return systemSS().getSheetByName('_meta'); }
function metaRead() {
  var sh = metaSheet(); var last = sh.getLastRow(); var map = {};
  if (last >= 2) { var vals = sh.getRange(2, 1, last - 1, 2).getValues(); for (var i = 0; i < vals.length; i++) if (vals[i][0]) map[String(vals[i][0])] = { value: String(vals[i][1]), row: i + 2 }; }
  return map;
}
function metaGet(key) { var c = cache().get('m:' + key); if (c) return c; var hit = metaRead()[key]; if (hit) cache().put('m:' + key, hit.value, 21600); return hit ? hit.value : null; }
function metaSet(key, value) {
  var sh = metaSheet(); var map = metaRead();
  if (map[key]) sh.getRange(map[key].row, 1, 1, 2).setValues([[key, value]]);
  else sh.appendRow([key, value]);
  cache().put('m:' + key, String(value), 21600);
}

// ── Per-user spreadsheet (ONE per user, tabs inside) ─────────────────────────
function writeHeaders(sh, def) { sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]); sh.setFrozenRows(1); }

function ensureAllTabs(ss) {
  for (var i = 0; i < ALL_SHEETS.length; i++) {
    var def = DEFS[ALL_SHEETS[i]];
    var sh = ss.getSheetByName(def.tab);
    if (!sh) { sh = ss.insertSheet(def.tab); writeHeaders(sh, def); }
  }
  var d = ss.getSheetByName('Sheet1'); if (d && ss.getSheets().length > 1) ss.deleteSheet(d);
}

// Create-or-get the user's single spreadsheet (double-checked + locked).
function userSS(user) {
  var key = 'ss:' + user.id;
  var id = metaGet(key);
  if (id) { var ua = aliveSS(id); if (ua) return ua; }
  return withLock(function () {
    var again = metaGet(key);
    if (again) { var ub = aliveSS(again); if (ub) return ub; }
    var shortId = String(user.id).replace(/-/g, '').slice(0, 8) || String(Date.now());
    var ss = SpreadsheetApp.create(sanitize(user.name) + '_' + shortId);
    DriveApp.getFileById(ss.getId()).moveTo(mainFolder());
    ensureAllTabs(ss);
    metaSet(key, ss.getId());
    metaSet('user:' + user.id, JSON.stringify({ name: user.name, email: user.email }));
    return ss;
  });
}

// Open the user's spreadsheet if it already exists (NO creation). null if none.
function peekUserSS(userId) {
  var id = metaGet('ss:' + userId);
  if (!id) return null;
  return aliveSS(id); // null if the user's spreadsheet was deleted/trashed
}

function getTab(user, name, create) {
  var def = defOf(name);
  var ss = create ? userSS(user) : peekUserSS(user.id);
  if (!ss) return null;
  var sh = ss.getSheetByName(def.tab);
  if (!sh && create) { sh = ss.insertSheet(def.tab); writeHeaders(sh, def); }
  return sh ? { sheet: sh, def: def } : null;
}

function readTable(sheet, def) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var vals = sheet.getRange(2, 1, last - 1, def.headers.length).getValues();
  var rows = [];
  for (var i = 0; i < vals.length; i++) {
    var obj = { _row: i + 2 }; var empty = true;
    for (var c = 0; c < def.headers.length; c++) { var v = dec(vals[i][c]); obj[def.headers[c]] = v; if (v !== null) empty = false; }
    if (!empty) rows.push(obj);
  }
  return rows;
}
function strip(r) { var o = {}; for (var k in r) if (k !== '_row') o[k] = r[k]; return o; }

// ── Routes ───────────────────────────────────────────────────────────────────
function provisionRoute(body) {
  var ss = userSS(userOf(body));
  ensureAllTabs(ss);
  return { spreadsheetId: ss.getId(), url: ss.getUrl() };
}

function listRoute(body) {
  var ref = getTab(userOf(body), String(body.sheet), false);
  if (!ref) return [];
  return readTable(ref.sheet, ref.def).map(strip);
}

function upsertRoute(body) {
  var user = userOf(body);
  var rows = body.rows || [];
  if (!rows.length) return [];
  var ref = getTab(user, String(body.sheet), true);
  var name = String(body.sheet), def = ref.def;
  return withLock(function () {
    var table = readTable(ref.sheet, def);
    var keyOf = function (r) { return def.keys.map(function (k) { return String(r[k]); }).join(' '); };
    var byRow = {}; table.forEach(function (r) { byRow[keyOf(r)] = r; });
    var results = [];
    rows.forEach(function (incoming) {
      var hit = byRow[keyOf(incoming)];
      if (hit) {
        var merged = {};
        def.headers.forEach(function (h) { merged[h] = incoming[h] !== undefined ? incoming[h] : hit[h]; });
        deriveRow(name, merged);
        ref.sheet.getRange(hit._row, 1, 1, def.headers.length).setValues([def.headers.map(function (h) { return encFor(def, h, merged[h]); })]);
        results.push(merged);
      } else {
        var fresh = {};
        def.headers.forEach(function (h) {
          if (incoming[h] !== undefined) fresh[h] = incoming[h];
          else if (h === 'created_at' || h === 'updated_at') fresh[h] = nowIso();
          else fresh[h] = null;
        });
        deriveRow(name, fresh);
        ref.sheet.appendRow(def.headers.map(function (h) { return encFor(def, h, fresh[h]); }));
        byRow[keyOf(fresh)] = { _row: ref.sheet.getLastRow() };
        results.push(fresh);
      }
    });
    return results;
  });
}

function deleteRoute(body) {
  var ids = (body.ids || []).map(String);
  if (!ids.length) return { deleted: 0 };
  var ref = getTab(userOf(body), String(body.sheet), false);
  if (!ref) return { deleted: 0 };
  return withLock(function () {
    var table = readTable(ref.sheet, ref.def), deleted = 0;
    for (var i = table.length - 1; i >= 0; i--) if (ids.indexOf(String(table[i][ref.def.idCol])) !== -1) { ref.sheet.deleteRow(table[i]._row); deleted++; }
    return { deleted: deleted };
  });
}

function clearRoute(body) {
  var ref = getTab(userOf(body), String(body.sheet), false);
  if (!ref) return { deleted: 0 };
  var where = body.where || null;
  return withLock(function () {
    var table = readTable(ref.sheet, ref.def), deleted = 0;
    for (var i = table.length - 1; i >= 0; i--) {
      var row = table[i], match = true;
      if (where) Object.keys(where).forEach(function (key) {
        var a = row[key] === null ? false : row[key], b = where[key] === null ? false : where[key];
        if (JSON.stringify(a) !== JSON.stringify(b)) match = false;
      });
      if (match) { ref.sheet.deleteRow(row._row); deleted++; }
    }
    return { deleted: deleted };
  });
}

// Cross-user leaderboard from every user's ta_challenges + ta_entries tabs.
// Returns user_id + scores; the frontend joins names (authoritative) from Supabase.
function leaderboardRoute(body) {
  userOf(body);
  var hit = cache().get('leaderboard');
  if (hit) return JSON.parse(hit);
  var meta = metaRead();
  var userIds = [];
  Object.keys(meta).forEach(function (k) { var m = /^ss:(.+)$/.exec(k); if (m) userIds.push(m[1]); });
  var out = [];
  userIds.forEach(function (uid) {
    var ss = peekUserSS(uid); if (!ss) return;
    var ch = ss.getSheetByName('ta_challenges'); if (!ch) return;
    var runs = readTable(ch, DEFS.ta_challenges).map(strip)
      .filter(function (c) { return c.status === 'Active Challenge' || c.status === 'Completed Challenge'; })
      .sort(function (a, b) { return new Date(b.started_at) - new Date(a.started_at); });
    if (!runs.length) return;
    var run = runs[0];
    var started = new Date(run.started_at), ended = run.completed_at ? new Date(run.completed_at) : new Date();
    var days = Number(run.days) || 1;
    var daysElapsed = Math.min(days, Math.max(1, Math.floor((ended - started) / 86400000) + 1));
    var startDay = Date.UTC(started.getUTCFullYear(), started.getUTCMonth(), started.getUTCDate());
    var windowEnd = startDay + days * 86400000;
    var en = ss.getSheetByName('ta_entries');
    var audits = en ? readTable(en, DEFS.ta_entries).map(strip) : [];
    var auditDays = {}, pctSum = 0, pctCount = 0;
    audits.forEach(function (a) {
      var e = a.entry || {}; if (!e.date) return;
      var d = new Date(e.date); if (isNaN(d)) return;
      var day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      if (day < startDay || day >= windowEnd) return;
      auditDays[day] = true; pctSum += Number((e.stats && e.stats.productivityPct) || 0); pctCount++;
    });
    var auditDayCount = Object.keys(auditDays).length;
    var coverage = (100 * Math.min(auditDayCount, daysElapsed)) / daysElapsed;
    var avgPct = pctCount ? pctSum / pctCount : 0;
    out.push({ user_id: uid, days: days, status: run.status, days_elapsed: daysElapsed,
      coverage_pct: Math.round(coverage), avg_productivity: Math.round(avgPct), score: Math.round(0.5 * coverage + 0.5 * avgPct) });
  });
  out.sort(function (a, b) { return b.score - a.score || b.days_elapsed - a.days_elapsed; });
  out.forEach(function (s, i) { s.rank = i + 1; });
  cache().put('leaderboard', JSON.stringify(out), 60);
  return out;
}
