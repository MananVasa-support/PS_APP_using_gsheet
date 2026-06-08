import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { challenge as mockChallenge, leaderboard as mockLeaderboard, achievements } from '@/data/mockData';

/** Challenges / gamification data. */

export async function getChallenge() {
  if (!isConfigured) return { challenge: mockChallenge, leaderboard: mockLeaderboard, achievements };

  const { data: list, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw unwrapError(error);

  const ch = list?.[0];
  if (!ch) return { challenge: mockChallenge, leaderboard: mockLeaderboard, achievements };

  // Leaderboard: top participation rows joined to profile names.
  const { data: lbRows } = await supabase
    .from('challenge_participations')
    .select('points, user_id')
    .order('points', { ascending: false })
    .limit(20);

  const userIds = [...new Set((lbRows || []).map((r) => r.user_id))];
  let userMap = new Map();
  if (userIds.length) {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, name, department')
      .in('id', userIds);
    userMap = new Map((users || []).map((u) => [u.id, u]));
  }

  const board = (lbRows || []).map((row, i) => {
    const u = userMap.get(row.user_id);
    return {
      rank: i + 1,
      name: u?.name || 'Anonymous',
      points: row.points,
      dept: u?.department || '—',
    };
  });

  // Current user's participation (if any).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let myParticipation = null;
  if (session?.user?.id) {
    const { data } = await supabase
      .from('challenge_participations')
      .select('*')
      .eq('challenge_id', ch.id)
      .eq('user_id', session.user.id)
      .maybeSingle();
    myParticipation = data;
  }

  return {
    challenge: {
      id: ch.id,
      name: ch.name,
      tagline: ch.tagline,
      difficulty: ch.difficulty,
      durationDays: ch.duration_days,
      daysLeft: ch.duration_days,
      reward: ch.reward,
      participants: board.length,
      overallProgress: myParticipation?.progress ?? 0,
      currentStreak: myParticipation?.streak ?? 0,
      level: 1,
      levelProgress: 0,
      dailyTargets: mockChallenge.dailyTargets, // illustrative until we track per-day points
    },
    leaderboard: board.length ? board : mockLeaderboard,
    achievements,
  };
}

export async function joinChallenge(id) {
  if (!isConfigured) return { id, joined: true };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('challenge_participations')
    .upsert({ challenge_id: id, user_id: uid }, { onConflict: 'challenge_id,user_id' });
  if (error) throw unwrapError(error);
  return { id, joined: true };
}
