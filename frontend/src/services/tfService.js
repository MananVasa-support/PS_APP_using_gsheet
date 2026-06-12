import { call, newId, getToken, isConfigured } from '@/lib/gsApi';

/**
 * Time Finder assessments — data layer for the whole Time Finder tool.
 *
 * Storage model (Google Sheets backend): ONE row per assessment in the user's
 * "Time Finder" spreadsheet, `assessments` worksheet:
 *   id | assessment (JSON) | archived | created_at
 * `assessment` holds the object the UI builds: { title?, createdAt, routines[],
 * totalTimeSaved }. Active vs archived lives in the `archived` column.
 *
 * Demo mode (no VITE_API_BASE_URL): falls back to the original localStorage
 * keys ('assessments' / 'archivedAssessments') so the tool still works offline.
 *
 * NOTE: the in-progress working draft ('currentAssessment') deliberately stays
 * in localStorage — only COMPLETED assessments are stored in the backend.
 */

const ACTIVE_KEY = 'assessments';
const ARCHIVED_KEY = 'archivedAssessments';
const TOOL = 'time-finder';

// ── localStorage fallback (demo mode) ───────────────────────────────────────
const localRead = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};
const localWrite = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

const rowToAssessment = (row) => ({ ...(row.assessment || {}), id: row.id, archived: !!row.archived });

// ── public API ───────────────────────────────────────────────────────────────

/** All assessments for the signed-in user, split into active/archived (newest first). */
export async function listAssessments() {
  if (!isConfigured) {
    return { active: localRead(ACTIVE_KEY), archived: localRead(ARCHIVED_KEY) };
  }
  const rows = await call('/list', { tool: TOOL, sheet: 'assessments' });
  const all = (rows || [])
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(rowToAssessment);
  return {
    active: all.filter((a) => !a.archived),
    archived: all.filter((a) => a.archived),
  };
}

/** Save a NEW assessment (active). Returns it with its database id. */
export async function saveAssessment(payload, { archived = false } = {}) {
  if (!isConfigured) {
    const a = { id: Date.now(), ...payload };
    const key = archived ? ARCHIVED_KEY : ACTIVE_KEY;
    localWrite(key, [a, ...localRead(key)]);
    return a;
  }
  if (!getToken()) throw new Error('Not signed in.');
  const row = { id: newId(), assessment: payload, archived, created_at: new Date().toISOString() };
  const [saved] = await call('/upsert', { tool: TOOL, sheet: 'assessments', rows: [row] });
  return rowToAssessment(saved || row);
}

/** Overwrite an assessment's content (e.g. after inline routine edits). */
export async function updateAssessment(id, payload) {
  if (!isConfigured) {
    for (const key of [ACTIVE_KEY, ARCHIVED_KEY]) {
      localWrite(key, localRead(key).map((a) => (String(a.id) === String(id) ? { ...a, ...payload } : a)));
    }
    return { id, ...payload };
  }
  const [saved] = await call('/upsert', { tool: TOOL, sheet: 'assessments', rows: [{ id, assessment: payload }] });
  return rowToAssessment(saved || { id, assessment: payload });
}

/** Move an assessment between active and archived. */
export async function setArchived(id, archived) {
  if (!isConfigured) {
    const fromKey = archived ? ACTIVE_KEY : ARCHIVED_KEY;
    const toKey = archived ? ARCHIVED_KEY : ACTIVE_KEY;
    const from = localRead(fromKey);
    const item = from.find((a) => String(a.id) === String(id));
    if (item) {
      localWrite(fromKey, from.filter((a) => String(a.id) !== String(id)));
      localWrite(toKey, [item, ...localRead(toKey)]);
    }
    return { ok: true };
  }
  await call('/upsert', { tool: TOOL, sheet: 'assessments', rows: [{ id, archived }] });
  return { ok: true };
}

/** Delete one assessment. */
export async function deleteAssessment(id) {
  if (!isConfigured) {
    for (const key of [ACTIVE_KEY, ARCHIVED_KEY]) {
      localWrite(key, localRead(key).filter((a) => String(a.id) !== String(id)));
    }
    return { ok: true };
  }
  await call('/delete', { tool: TOOL, sheet: 'assessments', ids: [id] });
  return { ok: true };
}

/** Delete ALL of the user's assessments in one bucket (Clear All button). */
export async function clearAssessments(archived) {
  if (!isConfigured) {
    localStorage.removeItem(archived ? ARCHIVED_KEY : ACTIVE_KEY);
    return { ok: true };
  }
  if (!getToken()) throw new Error('Not signed in.');
  await call('/clear', { tool: TOOL, sheet: 'assessments', where: { archived: !!archived } });
  return { ok: true };
}
