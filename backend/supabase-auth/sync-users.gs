/**
 * One-time (re-runnable) migration: copy the `_System` → `users` sheet into the
 * Supabase `app_users` table, WITHOUT data loss. Existing password_hash + salt
 * are carried over verbatim, so migrated users keep their passwords.
 *
 * This is the ONLY thing that reads the users sheet after cutover; it does not
 * touch any tool spreadsheet or the `_meta` tab.
 *
 * SETUP (one time):
 *   1. Open the `_System` spreadsheet in Google Sheets → Extensions → Apps
 *      Script. Paste this file in.
 *   2. Project Settings (gear) → Script properties → add:
 *        SUPABASE_URL                = https://<project-ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY   = <service_role key>   (NOT the anon key!)
 *      The service-role key bypasses RLS so it can write the table. It is safe
 *      here because Apps Script runs privately under your account — never put
 *      this key in the frontend.
 *   3. Run `migrateUsers` once → authorize → check the Execution log.
 *      Re-running is safe (rows upsert by id).
 */

function migrateUsers() {
  var props = PropertiesService.getScriptProperties();
  var URL = props.getProperty('SUPABASE_URL');
  var KEY = props.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  if (!URL || !KEY) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Script properties first.');
  }

  var sheet = SpreadsheetApp.getActive().getSheetByName('users');
  if (!sheet) throw new Error('No "users" tab found in this spreadsheet.');

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log('Nothing to migrate — the users tab has no data rows.');
    return;
  }

  var header = values[0].map(String);
  var idx = {};
  header.forEach(function (h, i) { idx[h] = i; });

  // Cells are JSON-encoded by the app (strings show quotes, objects are JSON).
  function dec(v) {
    if (v === '' || v === null || v === undefined) return null;
    try { return JSON.parse(String(v)); } catch (e) { return String(v); }
  }

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var id = dec(row[idx.id]);
    if (!id) continue; // skip blank lines
    rows.push({
      id: id,
      name: dec(row[idx.name]),
      email: dec(row[idx.email]),
      phone: dec(row[idx.phone]),
      country: dec(row[idx.country]),
      role: dec(row[idx.role]) || 'client',
      status: dec(row[idx.status]) || 'Active',
      title: dec(row[idx.title]),
      department: dec(row[idx.department]),
      timezone: dec(row[idx.timezone]),
      avatar: dec(row[idx.avatar]),
      preferences: dec(row[idx.preferences]) || {},
      password_hash: dec(row[idx.password_hash]),
      salt: dec(row[idx.salt]),
      created_at: dec(row[idx.created_at])
    });
  }

  if (!rows.length) {
    Logger.log('No user rows with an id were found.');
    return;
  }

  // PostgREST upsert: on_conflict=id + merge-duplicates makes this idempotent.
  var endpoint = URL.replace(/\/+$/, '') + '/rest/v1/app_users?on_conflict=id';
  var response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: KEY,
      Authorization: 'Bearer ' + KEY,
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    payload: JSON.stringify(rows),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  Logger.log('Migrated %s user(s) → HTTP %s', rows.length, code);
  if (code >= 300) {
    Logger.log('Response: %s', response.getContentText());
    throw new Error('Migration failed (HTTP ' + code + '). See the response logged above.');
  }
  Logger.log('Success. All users are now in Supabase app_users.');
}
