import { listRows, upsertRows, fetchLeaderboard, newId, getToken, isConfigured } from '@/lib/gsApi';
import { appListUsers } from '@/lib/supabaseAuth';

/**
 * Level-2 challenge runs — one row per run in the user's "Time Auditor"
 * spreadsheet, `challenges` tab:
 *   id | days | status | started_at | completed_at | created_at
 * History is kept (every run a user ever did stays as a row). Demo mode
 * (no Google client id) is handled by ChallengeContext's localStorage state.
 */

/** The signed-in user's challenge history, newest first. */
export async function listMyRuns() {
  if (!isConfigured) return [];
  const rows = await listRows('ta_challenges');
  return rows.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
}

export async function startRun(days) {
  if (!isConfigured) return null;
  if (!getToken()) throw new Error('Not signed in.');
  const now = new Date().toISOString();
  const row = { id: newId(), days, status: 'Active Challenge', started_at: now, completed_at: null, created_at: now };
  const [saved] = await upsertRows('ta_challenges', [row]);
  return saved || row;
}

export async function setRunStatus(id, status) {
  if (!isConfigured || !id) return null;
  const patch = { id, status };
  if (status === 'Completed Challenge') patch.completed_at = new Date().toISOString();
  // upsertRows MERGES: only the provided columns change; returns the full row.
  const [saved] = await upsertRows('ta_challenges', [patch]);
  return saved || null;
}

/**
 * The cross-user leaderboard — computed SERVER-SIDE by the Apps Script Web App
 * (it can read every user's Time Auditor spreadsheet; the browser can't).
 * Same formula as the old SQL RPC:
 *   score = 50% consistency (share of elapsed challenge days with ≥1 audit)
 *         + 50% quality (avg productivity % of audits inside the window)
 * The server returns user_id + scores; we join the (authoritative) names from
 * Supabase. Returns ALL participants ranked; callers slice the top N.
 */
export async function getLeaderboard() {
  if (!isConfigured) return [];

  const [rows, users] = await Promise.all([fetchLeaderboard(), appListUsers().catch(() => [])]);
  const nameById = new Map((users || []).map((u) => [u.id, u.name]));

  return (rows || []).map((r) => ({
    ...r,
    name: nameById.get(r.user_id) || 'Anonymous',
  }));
}
