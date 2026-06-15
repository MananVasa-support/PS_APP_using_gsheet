/**
 * Time Auditor assessments — data layer.
 *
 * Storage: browser localStorage (one list under `ta_assessments_v2`). Google
 * Sheets storage was removed; tool data now lives locally until a backend is
 * wired up. Same exported surface so pages/contexts are unchanged.
 */

const LOCAL_KEY = 'ta_assessments_v2';

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

/** All of the user's assessments, newest first. */
export async function listAssessments() {
  return localList();
}

/** Save a NEW assessment. Returns it with its id. */
export async function saveAssessment(payload) {
  const a = { id: `asmt_${Date.now()}`, ...payload };
  localWrite([a, ...localList()]);
  return a;
}

/** Overwrite an existing assessment (used by re-save after Edit). */
export async function updateAssessment(id, payload) {
  localWrite(localList().map((a) => (a.id === id ? { id, ...payload } : a)));
  return { id, ...payload };
}

/** Delete one assessment. */
export async function deleteAssessment(id) {
  localWrite(localList().filter((a) => a.id !== id));
  return { ok: true };
}
