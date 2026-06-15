/**
 * Time Finder assessments — data layer.
 *
 * Storage: browser localStorage ('assessments' / 'archivedAssessments').
 * Google Sheets storage was removed; tool data now lives locally until a
 * backend is wired up. Same exported surface so the tool is unchanged.
 */

const ACTIVE_KEY = 'assessments';
const ARCHIVED_KEY = 'archivedAssessments';

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

/** All assessments, split into active/archived (newest first). */
export async function listAssessments() {
  return { active: localRead(ACTIVE_KEY), archived: localRead(ARCHIVED_KEY) };
}

/** Save a NEW assessment. Returns it with its id. */
export async function saveAssessment(payload, { archived = false } = {}) {
  const a = { id: Date.now(), ...payload };
  const key = archived ? ARCHIVED_KEY : ACTIVE_KEY;
  localWrite(key, [a, ...localRead(key)]);
  return a;
}

/** Overwrite an assessment's content (e.g. after inline routine edits). */
export async function updateAssessment(id, payload) {
  for (const key of [ACTIVE_KEY, ARCHIVED_KEY]) {
    localWrite(key, localRead(key).map((a) => (String(a.id) === String(id) ? { ...a, ...payload } : a)));
  }
  return { id, ...payload };
}

/** Move an assessment between active and archived. */
export async function setArchived(id, archived) {
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

/** Delete one assessment. */
export async function deleteAssessment(id) {
  for (const key of [ACTIVE_KEY, ARCHIVED_KEY]) {
    localWrite(key, localRead(key).filter((a) => String(a.id) !== String(id)));
  }
  return { ok: true };
}

/** Delete ALL assessments in one bucket (Clear All button). */
export async function clearAssessments(archived) {
  localStorage.removeItem(archived ? ARCHIVED_KEY : ACTIVE_KEY);
  return { ok: true };
}
