/**
 * ============================================================================
 * Productivity Shastra — TOOL DATA server (Google Apps Script Web App)
 * ============================================================================
 * AUTH is on Supabase (this script does NOT do auth). This web app is the
 * reliable, server-side store for all TOOL DATA in Google Sheets. The browser
 * POSTs each save here with the signed-in user's Supabase id; the script
 * writes to Sheets under THIS Google account (deploy with the Intern account)
 * in a folder per user. No per-user Google popup, reliable + cross-device.
 *
 * DEPLOY (do this with the INTERN Google account):
 *   1. script.google.com → New project → paste this whole file.
 *   2. (Optional) set ROOT_FOLDER_ID below to an existing Drive folder id;
 *      leave '' to auto-create a "Productivity-Shastra-Data" folder in My Drive.
 *   3. Deploy → New deployment → type "Web app" →
 *        Execute as: Me   |   Who has access: Anyone
 *      → Deploy → authorize → copy the Web app URL (ends in /exec).
 *   4. Put that URL in the frontend: VITE_API_BASE_URL (Vercel env var + .env).
 *   5. After ANY edit here: Deploy → Manage deployments → edit → New version.
 *
 * Drive structure (all auto-created, ids cached in the _System/_meta tab):
 *   <root folder>
 *     ├─ _System  (spreadsheet, _meta tab = folder/spreadsheet id cache)
 *     └─ "<name> — <email>"   (one folder per user, by Supabase userId)
 *          ├─ Time Auditor        (entries, challenges)
 *          ├─ Time Finder         (assessments)
 *          ├─ Meeting             (meetings)
 *          ├─ Power Planner       (weeks, reviews, settings)
 *          └─ Reasons Eliminator  (sessions, grip_tests, grip_history)
 *
 * API (POST JSON, Content-Type text/plain): { route, userId, userName,
 *   userEmail, sheet, rows|ids|where }
 *   /list /upsert /delete /clear /leaderboard
 * Response: { ok:true, data, ms } | { ok:false, error:{message,code}, ms }
 * ============================================================================
 */

// Leave '' to auto-create the root folder; or paste a Drive folder id to use it.
const ROOT_FOLDER_ID = '';
const ROOT_NAME = 'Productivity-Shastra-Data';
const SYSTEM_NAME = '_System';

// ── Schema: logical sheet name → { file (spreadsheet), tab, headers, keys } ──
// Mirrors frontend SHEET_DEFS. `derived` columns are auto-filled from the JSON
// so the sheet is human-readable; `keys` is what upsert merges on.
const DEFS = {
  ta_entries: { file: 'Time Auditor', tab: 'entries', keys: ['id'], idCol: 'id',
    headers: ['id', 'date', 'start_time', 'slots_count', 'productivity_pct', 'top3', 'entry', 'created_at'],
    derived: ['date', 'start_time', 'slots_count', 'productivity_pct', 'top3'] },
  ta_challenges: { file: 'Time Auditor', tab: 'challenges', keys: ['id'], idCol: 'id',
    headers: ['id', 'days', 'status', 'started_at', 'completed_at', 'created_at'] },
  tf_assessments: { file: 'Time Finder', tab: 'assessments', keys: ['id'], idCol: 'id',
    headers: ['id', 'title', 'routines_count', 'total_time_saved', 'archived', 'assessment', 'created_at'],
    derived: ['title', 'routines_count', 'total_time_saved'] },
  meetings: { file: 'Meeting', tab: 'meetings', keys: ['id'], idCol: 'id',
    headers: ['id', 'title', 'status', 'est_time', 'experience', 'archived', 'meeting', 'created_at', 'updated_at'],
    derived: ['title', 'status', 'est_time', 'experience', 'archived'] },
  pp_weeks: { file: 'Power Planner', tab: 'weeks', keys: ['week_start'], idCol: 'week_start',
    headers: ['week_start', 'commitments_count', 'actions_count', 'data', 'updated_at'],
    derived: ['commitments_count', 'actions_count'] },
  pp_reviews: { file: 'Power Planner', tab: 'reviews', keys: ['week_start'], idCol: 'week_start',
    headers: ['week_start', 'completion_pct', 'productivity_score', 'total_commitments', 'planned_hours', 'delegated_count', 'insights', 'updated_at'] },
  pp_settings: { file: 'Power Planner', tab: 'settings', keys: ['id'], idCol: 'id',
    headers: ['id', 'start_date', 'schedule', 'custom_options', 'gcal_event_ids', 'updated_at'] },
  re_sessions: { file: 'Reasons Eliminator', tab: 'sessions', keys: ['id'], idCol: 'id',
    headers: ['id', 'status', 'source', 'week_start', 'reasons_count', 'reasons_preview', 'reasons', 'created_at', 'updated_at'],
    derived: ['reasons_count', 'reasons_preview'] },
  re_grip_tests: { file: 'Reasons Eliminator', tab: 'grip_tests', keys: ['reason_id'], idCol: 'reason_id',
    headers: ['reason_id', 'session_id', 'seq', 'reason_text', 'reason_date', 'score', 'status', 'updated_at'] },
  re_grip_history: { file: 'Reasons Eliminator', tab: 'grip_history', keys: ['id'], idCol: 'id',
    headers: ['id', 'run_date', 'month', 'entries_count', 'archived', 'entries', 'updated_at'],
    derived: ['entries_count'] },
};

// file (spreadsheet) → its tab defs (so a tool file is created whole).
const FILES = {};
Object.keys(DEFS).forEach(function (name) {
  var d = DEFS[name];
  (FILES[d.file] = FILES[d.file] || []).push(d);
});

// Derive readable columns from a row's JSON (kept in sync with the frontend).
function deriveRow(name, row) {
  var d = DEFS[name];
  if (!d.derived) return row;
  var n = function (v) { return Array.isArray(v) ? v.length : 0; };
  if (name === 'ta_entries') {
    var e = row.entry || {};
    row.date = e.date || null; row.start_time = e.startTime || null;
    row.slots_count = n(e.slots); row.productivity_pct = (e.stats && e.stats.productivityPct) != null ? e.stats.productivityPct : null;
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

// Every cell is JSON-encoded so types round-trip; derived strings unquoted.
function enc(v) { return (v === undefined || v === null) ? '' : JSON.stringify(v); }
function encFor(def, h, v) { return (def.derived && def.derived.indexOf(h) !== -1 && typeof v === 'string') ? v : enc(v); }
function dec(v) { if (v === '' || v === null || v === undefined) return null; try { return JSON.parse(String(v)); } catch (e) { return String(v); } }

// ── System spreadsheet + _meta id cache ─────────────────────────────────────
function rootFolder() {
  if (ROOT_FOLDER_ID) return DriveApp.getFolderById(ROOT_FOLDER_ID);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('root_id');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  return withLock(function () {
    var again = PropertiesService.getScriptProperties().getProperty('root_id');
    if (again) { try { return DriveApp.getFolderById(again); } catch (e) {} }
    var it = DriveApp.getFoldersByName(ROOT_NAME);
    var f = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
    PropertiesService.getScriptProperties().setProperty('root_id', f.getId());
    return f;
  });
}

function systemSS() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('system_id');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  return withLock(function () {
    var again = PropertiesService.getScriptProperties().getProperty('system_id');
    if (again) { try { return SpreadsheetApp.openById(again); } catch (e) {} }
    var root = rootFolder();
    var ss = null;
    var ex = root.getFilesByName(SYSTEM_NAME);
    if (ex.hasNext()) ss = SpreadsheetApp.openById(ex.next().getId());
    else { ss = SpreadsheetApp.create(SYSTEM_NAME); DriveApp.getFileById(ss.getId()).moveTo(root); }
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
  var sh = metaSheet(); var last = sh.getLastRow();
  var map = {};
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

// ── Per-user folder + tool spreadsheets ─────────────────────────────────────
function userFolder(user) {
  var key = 'folder:' + user.id;
  var id = metaGet(key);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  return withLock(function () {
    var again = metaGet(key);
    if (again) { try { return DriveApp.getFolderById(again); } catch (e) {} }
    var label = (user.name || 'User') + (user.email ? ' — ' + user.email : ' — ' + user.id);
    var folder = rootFolder().createFolder(label);
    metaSet(key, folder.getId());
    metaSet('user:' + user.id, JSON.stringify({ name: user.name, email: user.email }));
    return folder;
  });
}

function toolSS(user, file) {
  var key = 'ss:' + user.id + ':' + file;
  var id = metaGet(key);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  return withLock(function () {
    var again = metaGet(key);
    if (again) { try { return SpreadsheetApp.openById(again); } catch (e) {} }
    var folder = userFolder(user);
    var ss = SpreadsheetApp.create(file);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    var defs = FILES[file];
    for (var i = 0; i < defs.length; i++) {
      var sh = ss.insertSheet(defs[i].tab);
      sh.getRange(1, 1, 1, defs[i].headers.length).setValues([defs[i].headers]);
      sh.setFrozenRows(1);
    }
    var d = ss.getSheetByName('Sheet1');
    if (d) ss.deleteSheet(d);
    metaSet(key, ss.getId());
    return ss;
  });
}

function peekSS(userId, file) { var id = metaGet('ss:' + userId + ':' + file); if (!id) return null; try { return SpreadsheetApp.openById(id); } catch (e) { return null; } }

function getTab(user, name, create) {
  var def = defOf(name);
  var ss = create ? toolSS(user, def.file) : peekSS(user.id, def.file);
  if (!ss) return null;
  var sh = ss.getSheetByName(def.tab);
  if (!sh && create) { sh = ss.insertSheet(def.tab); sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]); sh.setFrozenRows(1); }
  return sh ? { sheet: sh, def: def } : null;
}

function colLetter(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

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
function listRoute(body) {
  var user = userOf(body);
  var ref = getTab(user, String(body.sheet), false);
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
    var byRow = {}; table.forEach(function (r) { byRow[keyOf(r)] = r._row; });
    var results = [];
    rows.forEach(function (incoming) {
      var k = keyOf(incoming);
      var existingRow = byRow[k];
      if (existingRow) {
        var prev = null;
        for (var i = 0; i < table.length; i++) if (table[i]._row === existingRow) { prev = table[i]; break; }
        var merged = {};
        def.headers.forEach(function (h) { merged[h] = incoming[h] !== undefined ? incoming[h] : (prev ? prev[h] : null); });
        deriveRow(name, merged);
        ref.sheet.getRange(existingRow, 1, 1, def.headers.length).setValues([def.headers.map(function (h) { return encFor(def, h, merged[h]); })]);
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
        byRow[k] = ref.sheet.getLastRow();
        table.push({ _row: byRow[k] });
        results.push(fresh);
      }
    });
    return results;
  });
}

function deleteRoute(body) {
  var user = userOf(body);
  var ids = (body.ids || []).map(String);
  if (!ids.length) return { deleted: 0 };
  var ref = getTab(user, String(body.sheet), false);
  if (!ref) return { deleted: 0 };
  return withLock(function () {
    var table = readTable(ref.sheet, ref.def), deleted = 0;
    for (var i = table.length - 1; i >= 0; i--) if (ids.indexOf(String(table[i][ref.def.idCol])) !== -1) { ref.sheet.deleteRow(table[i]._row); deleted++; }
    return { deleted: deleted };
  });
}

function clearRoute(body) {
  var user = userOf(body);
  var ref = getTab(user, String(body.sheet), false);
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

// Cross-user leaderboard from every user's Time Auditor data. Returns userId +
// scores; the frontend joins names (authoritative) from Supabase.
function leaderboardRoute(body) {
  userOf(body);
  var hit = cache().get('leaderboard');
  if (hit) return JSON.parse(hit);
  var meta = metaRead();
  var userIds = {};
  Object.keys(meta).forEach(function (k) { var m = /^ss:(.+):Time Auditor$/.exec(k); if (m) userIds[m[1]] = true; });
  var out = [];
  Object.keys(userIds).forEach(function (uid) {
    var ss = peekSS(uid, 'Time Auditor'); if (!ss) return;
    var ch = ss.getSheetByName('challenges'); if (!ch) return;
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
    var en = ss.getSheetByName('entries');
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
