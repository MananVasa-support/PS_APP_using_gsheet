import { call, newId, getToken, isConfigured } from '@/lib/gsApi';

/**
 * Level-2 challenge runs — one row per run in the user's "Time Auditor"
 * spreadsheet, `challenges` worksheet:
 *   id | days | status | started_at | completed_at | created_at
 * History is kept (every run a user ever did stays as a row). Demo mode
 * (no API url) is handled by ChallengeContext's localStorage state.
 */

const TOOL = 'time-auditor';

/** The signed-in user's challenge history, newest first. */
export async function listMyRuns() {
  if (!isConfigured) return [];
  const rows = await call('/list', { tool: TOOL, sheet: 'challenges' });
  return (rows || []).sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
}

export async function startRun(days) {
  if (!isConfigured) return null;
  if (!getToken()) throw new Error('Not signed in.');
  const now = new Date().toISOString();
  const row = { id: newId(), days, status: 'Active Challenge', started_at: now, completed_at: null, created_at: now };
  const [saved] = await call('/upsert', { tool: TOOL, sheet: 'challenges', rows: [row] });
  return saved || row;
}

/**
 * The cross-user leaderboard — computed SERVER-SIDE by the Apps Script (it can
 * read every user's Time Auditor spreadsheet; the browser never can), exposing
 * only safe aggregates (rank/name/score). Returns ALL participants ranked;
 * callers slice the top N. Score = 50% consistency (challenge days with an
 * audit) + 50% avg audit productivity — same formula as the old SQL RPC.
 */
export async function getLeaderboard() {
  if (!isConfigured) return [];
  const data = await call('/leaderboard', {});
  return data || [];
}

export async function setRunStatus(id, status) {
  if (!isConfigured || !id) return null;
  const patch = { id, status };
  if (status === 'Completed Challenge') patch.completed_at = new Date().toISOString();
  // /upsert MERGES: only the provided columns change; returns the full row.
  const [saved] = await call('/upsert', { tool: TOOL, sheet: 'challenges', rows: [patch] });
  return saved || null;
}
