/**
 * Time Auditor Level-2 challenge runs — data layer.
 *
 * Google Sheets storage was removed. ChallengeContext keeps the challenge
 * state in browser localStorage, so these functions are inert in local mode.
 * The cross-user leaderboard needs a shared backend, so it returns empty (the
 * Level-2 ranking pages fall back to their illustrative mock).
 */

/** Local mode → ChallengeContext loads runs from localStorage. */
export async function listMyRuns() {
  return [];
}

export async function startRun() {
  return null;
}

export async function setRunStatus() {
  return null;
}

/** Cross-user leaderboard needs a shared backend (removed) → none in local mode. */
export async function getLeaderboard() {
  return [];
}
