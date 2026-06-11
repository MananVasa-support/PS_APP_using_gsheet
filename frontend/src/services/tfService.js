import { supabase, unwrapError, isConfigured } from '@/lib/supabase';

/**
 * Time Finder assessments — data layer for the whole Time Finder tool.
 *
 * Storage model: ONE row per assessment in `time_finder_assessments`
 *   { id uuid, user_id uuid, assessment jsonb, archived bool, created_at }
 * `assessment` holds the object the UI builds: { title?, createdAt, routines[],
 * totalTimeSaved }. Active vs archived lives in the `archived` column. A user
 * can save unlimited assessments; RLS scopes rows (own / consultant-read /
 * admin-all) and the user_id index keeps per-user lookups instant.
 *
 * Demo mode (no Supabase env): falls back to the original localStorage keys
 * ('assessments' / 'archivedAssessments') so the tool still works offline.
 *
 * NOTE: the in-progress working draft ('currentAssessment') deliberately stays
 * in localStorage — only COMPLETED assessments are stored in the database.
 */

const ACTIVE_KEY = 'assessments';
const ARCHIVED_KEY = 'archivedAssessments';

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

async function myId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

const rowToAssessment = (row) => ({ ...(row.assessment || {}), id: row.id, archived: row.archived });

// ── public API ───────────────────────────────────────────────────────────────

/** All assessments for the signed-in user, split into active/archived (newest first). */
export async function listAssessments() {
  if (!isConfigured) {
    return { active: localRead(ACTIVE_KEY), archived: localRead(ARCHIVED_KEY) };
  }
  const { data, error } = await supabase
    .from('time_finder_assessments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);
  const all = (data || []).map(rowToAssessment);
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
  const uid = await myId();
  if (!uid) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from('time_finder_assessments')
    .insert({ user_id: uid, assessment: payload, archived })
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return rowToAssessment(data);
}

/** Overwrite an assessment's content (e.g. after inline routine edits). */
export async function updateAssessment(id, payload) {
  if (!isConfigured) {
    for (const key of [ACTIVE_KEY, ARCHIVED_KEY]) {
      localWrite(key, localRead(key).map((a) => (String(a.id) === String(id) ? { ...a, ...payload } : a)));
    }
    return { id, ...payload };
  }
  const { data, error } = await supabase
    .from('time_finder_assessments')
    .update({ assessment: payload })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return rowToAssessment(data);
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
  const { error } = await supabase
    .from('time_finder_assessments')
    .update({ archived })
    .eq('id', id);
  if (error) throw unwrapError(error);
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
  const { error } = await supabase.from('time_finder_assessments').delete().eq('id', id);
  if (error) throw unwrapError(error);
  return { ok: true };
}

/** Delete ALL of the user's assessments in one bucket (Clear All button). */
export async function clearAssessments(archived) {
  if (!isConfigured) {
    localStorage.removeItem(archived ? ARCHIVED_KEY : ACTIVE_KEY);
    return { ok: true };
  }
  const uid = await myId();
  if (!uid) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('time_finder_assessments')
    .delete()
    .eq('user_id', uid)
    .eq('archived', archived);
  if (error) throw unwrapError(error);
  return { ok: true };
}
