import { challenge as mockChallenge, leaderboard as mockLeaderboard, achievements } from '@/data/mockData';

/**
 * Challenges / gamification data — ILLUSTRATIVE ONLY.
 *
 * The gamification tables this page was designed around (`challenges`,
 * `challenge_participations`) never existed in any backend — not in the
 * Supabase schema on master, not in the Sheets backend here. The page always
 * effectively showed the mock bundle, so this service now returns it plainly
 * instead of throwing on dead tables.
 *
 * The REAL challenge system is Time Auditor Level-2 (`level2Service` →
 * ta_challenges sheet + the cross-user leaderboard) — that one is fully
 * backed by Google Sheets.
 */

export async function getChallenge() {
  return { challenge: mockChallenge, leaderboard: mockLeaderboard, achievements };
}

export async function joinChallenge(id) {
  return { id, joined: true };
}
