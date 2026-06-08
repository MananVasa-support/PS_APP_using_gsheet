import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import {
  timeDistribution,
  aiInsights,
  performanceRadar,
  focusTrend,
  round1,
  round2,
} from '@/data/mockData';

/** Analytics — distribution, focus trend, daily score, AI insights, round 1/2. */

export async function getAnalytics(range = 'week') {
  if (!isConfigured) {
    return { timeDistribution, aiInsights, performanceRadar, focusTrend, dailyScore: 78, round1, round2 };
  }

  const { data, error } = await supabase.rpc('get_analytics', { p_range: range });
  if (error) throw unwrapError(error);

  return {
    timeDistribution: Array.isArray(data?.timeDistribution) && data.timeDistribution.length
      ? data.timeDistribution
      : timeDistribution,
    focusTrend: Array.isArray(data?.focusTrend) && data.focusTrend.length
      ? data.focusTrend
      : focusTrend,
    dailyScore: data?.dailyScore ?? 0,
    // AI insights / radars / per-task rounds remain illustrative until backed by
    // a real model. Wire them up here once those pipelines exist.
    aiInsights,
    performanceRadar,
    round1,
    round2,
  };
}
