import { call, newId, getToken, isConfigured } from '@/lib/gsApi';

/**
 * Time Auditor assessments — the single data layer for the whole Time Auditor
 * suite (tool, Final Summary, Analytics, Reports).
 *
 * Storage model (Google Sheets backend): ONE row per assessment in the user's
 * "Time Auditor" spreadsheet, `entries` worksheet:
 *   id | entry (JSON) | created_at
 * The `entry` holds the full assessment exactly as the UI builds it:
 *   { date, startTime, slots[], top3[], stats, active }
 * A user can take the assessment INFINITE times → infinite rows. Per-user
 * isolation: the session token only ever resolves to that user's spreadsheet.
 *
 * Ids are generated CLIENT-SIDE (uuid) — the Sheets backend never invents ids.
 *
 * Offline/demo (no VITE_API_BASE_URL): falls back to localStorage, same shape.
 */

const LOCAL_KEY = 'ta_assessments_v2';
const TOOL = 'time-auditor';

// ── localStorage fallback (demo mode) ───────────────────────────────────────
function localList() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function localWrite(list) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

const rowToAssessment = (row) => ({ id: row.id, ...(row.entry || {}) });

// ── public API ───────────────────────────────────────────────────────────────

/** All of the signed-in user's assessments, newest first. */
export async function listAssessments() {
  if (!isConfigured) return localList();
  const rows = await call('/list', { tool: TOOL, sheet: 'entries' });
  return (rows || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(rowToAssessment);
}

/** Save a NEW assessment. Returns it with its database id. */
export async function saveAssessment(payload) {
  if (!isConfigured) {
    const a = { id: `asmt_${Date.now()}`, ...payload };
    localWrite([a, ...localList()]);
    return a;
  }
  if (!getToken()) throw new Error('Not signed in.');
  const row = { id: newId(), entry: payload, created_at: new Date().toISOString() };
  const [saved] = await call('/upsert', { tool: TOOL, sheet: 'entries', rows: [row] });
  return rowToAssessment(saved || row);
}

/** Overwrite an existing assessment (used by re-save after Edit). */
export async function updateAssessment(id, payload) {
  if (!isConfigured) {
    localWrite(localList().map((a) => (a.id === id ? { id, ...payload } : a)));
    return { id, ...payload };
  }
  const [saved] = await call('/upsert', { tool: TOOL, sheet: 'entries', rows: [{ id, entry: payload }] });
  return rowToAssessment(saved || { id, entry: payload });
}

/** Delete one assessment. */
export async function deleteAssessment(id) {
  if (!isConfigured) {
    localWrite(localList().filter((a) => a.id !== id));
    return { ok: true };
  }
  await call('/delete', { tool: TOOL, sheet: 'entries', ids: [id] });
  return { ok: true };
}
