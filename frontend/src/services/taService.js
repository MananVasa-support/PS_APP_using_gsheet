import { supabase, unwrapError, isConfigured } from '@/lib/supabase';

/**
 * Time Auditor assessments — the single data layer for the whole Time Auditor
 * suite (tool, Final Summary, Analytics, Reports).
 *
 * Storage model: ONE row per assessment in `time_auditor_entries`
 *   { id uuid, user_id uuid, entry jsonb, created_at }
 * The `entry` jsonb holds the full assessment exactly as the UI builds it:
 *   { date, startTime, slots[], top3[], stats, active }
 * A user can take the assessment INFINITE times → infinite rows, all tagged
 * with their user_id. RLS guarantees: client sees own rows, consultant sees
 * assigned clients' rows (read-only), admin sees all. The user_id index makes
 * "everything for this user" instant even at 1000s of users.
 *
 * Offline/demo (no Supabase env): falls back to localStorage so the tool still
 * works, same shape.
 */

const LOCAL_KEY = 'ta_assessments_v2';

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

async function myId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

const rowToAssessment = (row) => ({ id: row.id, ...(row.entry || {}) });

// ── public API ───────────────────────────────────────────────────────────────

/** All of the signed-in user's assessments, newest first. */
export async function listAssessments() {
  if (!isConfigured) return localList();
  const { data, error } = await supabase
    .from('time_auditor_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);
  return (data || []).map(rowToAssessment);
}

/** Save a NEW assessment. Returns it with its database id. */
export async function saveAssessment(payload) {
  if (!isConfigured) {
    const a = { id: `asmt_${Date.now()}`, ...payload };
    localWrite([a, ...localList()]);
    return a;
  }
  const uid = await myId();
  if (!uid) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from('time_auditor_entries')
    .insert({ user_id: uid, entry: payload })
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return rowToAssessment(data);
}

/** Overwrite an existing assessment (used by re-save after Edit). */
export async function updateAssessment(id, payload) {
  if (!isConfigured) {
    localWrite(localList().map((a) => (a.id === id ? { id, ...payload } : a)));
    return { id, ...payload };
  }
  const { data, error } = await supabase
    .from('time_auditor_entries')
    .update({ entry: payload })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return rowToAssessment(data);
}

/** Delete one assessment. */
export async function deleteAssessment(id) {
  if (!isConfigured) {
    localWrite(localList().filter((a) => a.id !== id));
    return { ok: true };
  }
  const { error } = await supabase.from('time_auditor_entries').delete().eq('id', id);
  if (error) throw unwrapError(error);
  return { ok: true };
}
