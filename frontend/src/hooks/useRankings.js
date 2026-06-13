import { useEffect, useState } from 'react';
import { rankings as mockRankings, weeklyProductivity as mockWeekly } from '@/data/rankingsMock';
import { getLeaderboard } from '@/services/level2Service';
import { listAssessments } from '@/services/taService';
import { isConfigured, getSession } from '@/lib/gsApi';

/**
 * Level-2 rankings for the Analysis / Top-3 / Top-4 / Performance pages.
 *
 * Renders instantly with the illustrative mock list, then swaps in the REAL
 * cross-user leaderboard (Sheets backend) once it loads — mapped to the shape
 * these pages have always used. If nobody has joined a challenge yet (or in
 * offline demo mode) the mock stays, so the pages never look broken.
 */
export function useRankings() {
  const [rankings, setRankings] = useState(mockRankings);

  useEffect(() => {
    if (!isConfigured) return undefined;
    let active = true;
    const myId = getSession()?.user?.id;
    getLeaderboard()
      .then((rows) => {
        if (!active || !rows?.length) return;
        setRankings(
          rows.map((r) => ({
            rank: r.rank,
            name: r.name,
            dept: `${r.days}-day challenge`,
            points: r.score,
            productivity: r.avg_productivity,
            streak: r.days_elapsed,
            completion: r.coverage_pct,
            isMe: r.user_id === myId,
          }))
        );
      })
      .catch(() => {
        /* network hiccup → keep the mock */
      });
    return () => {
      active = false;
    };
  }, []);

  return rankings;
}

/**
 * The signed-in user's last-7-days productivity (one bar per day), computed
 * from their REAL Time Auditor assessments. Falls back to the illustrative
 * mock when there are no audits this week (or in offline demo mode).
 */
export function useWeeklyProductivity() {
  const [weekly, setWeekly] = useState(mockWeekly);

  useEffect(() => {
    if (!isConfigured) return undefined;
    let active = true;
    listAssessments()
      .then((list) => {
        if (!active) return;
        const days = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          days.push({
            key: d.toDateString(),
            label: d.toLocaleDateString(undefined, { weekday: 'short' }),
            vals: [],
          });
        }
        (list || []).forEach((a) => {
          if (!a.date) return;
          const d = new Date(a.date);
          if (Number.isNaN(d.getTime())) return;
          const hit = days.find((x) => x.key === d.toDateString());
          if (hit) hit.vals.push(Number(a.stats?.productivityPct || 0));
        });
        if (!days.some((x) => x.vals.length)) return; // no audits this week → keep the mock
        setWeekly(
          days.map((x) => ({
            label: x.label,
            value: x.vals.length ? Math.round(x.vals.reduce((s, v) => s + v, 0) / x.vals.length) : 0,
          }))
        );
      })
      .catch(() => {
        /* keep the mock */
      });
    return () => {
      active = false;
    };
  }, []);

  return weekly;
}
