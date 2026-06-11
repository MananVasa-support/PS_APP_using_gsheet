import { supabase, unwrapError, isConfigured } from '@/lib/supabase';

/**
 * Level-2 challenge runs — one row per run in `level2_challenges`
 *   { id, user_id, days, status, started_at, completed_at }
 * History is kept (every run a user ever did stays as a row); RLS scopes
 * rows the same way as assessments (own / consultant-read / admin-all).
 * Demo mode (no Supabase) is handled by ChallengeContext's localStorage state.
 */

async function myId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/** The signed-in user's challenge history, newest first. */
export async function listMyRuns() {
  if (!isConfigured) return [];
  const { data, error } = await supabase
    .from('level2_challenges')
    .select('*')
    .order('started_at', { ascending: false });
  if (error) throw unwrapError(error);
  return data || [];
}

export async function startRun(days) {
  if (!isConfigured) return null;
  const uid = await myId();
  if (!uid) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from('level2_challenges')
    .insert({ user_id: uid, days })
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return data;
}

/**
 * The cross-user leaderboard — computed server-side (SECURITY DEFINER RPC) so
 * it works despite RLS and exposes only safe aggregates (rank/name/score).
 * Returns ALL participants ranked; callers slice the top N. Score = 50%
 * consistency (challenge days with an audit) + 50% avg audit productivity.
 */
export async function getLeaderboard() {
  if (!isConfigured) return [];
  const { data, error } = await supabase.rpc('challenge_leaderboard');
  if (error) throw unwrapError(error);
  return data || [];
}

export async function setRunStatus(id, status) {
  if (!isConfigured || !id) return null;
  const patch = { status };
  if (status === 'Completed Challenge') patch.completed_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('level2_challenges')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return data;
}
