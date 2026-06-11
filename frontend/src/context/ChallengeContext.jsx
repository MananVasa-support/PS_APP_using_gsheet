import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { isConfigured } from '@/lib/supabase';
import { listMyRuns, startRun, setRunStatus } from '@/services/level2Service';

const ChallengeContext = createContext(null);

const DEFAULT = {
  unlocked: false, // true once the user clicks into Level 2 (reveals ranking sidebar items)
  participating: null, // true | false | null
  days: null, // 7 | 14 | 21 | 30 | custom number
  started: false,
  startDate: null, // ISO string
  status: null, // 'Active Challenge' | 'Completed Challenge'
  runId: null, // DB row id of the active run (level2_challenges)
  completedCount: 0, // total completed runs (drives Current level)
  longCompletedCount: 0, // completed runs of 21+ days
};

/**
 * Level 2 challenge state. Source of truth is Supabase (`level2_challenges` —
 * one row per run, full history kept per user). The state is mirrored into
 * localStorage (`ta_challenge`) so synchronous readers (utils/level.js) and
 * offline/demo mode keep working unchanged.
 */
export function ChallengeProvider({ children }) {
  const [state, setState] = useLocalStorage('ta_challenge', DEFAULT);

  // Hydrate from the database: latest run + completed counts. Also auto-moves
  // an Active run whose time has fully elapsed to 'Completed Challenge'.
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    (async () => {
      try {
        let runs = await listMyRuns();
        if (!active) return;
        const latest = runs[0] || null;
        if (latest?.status === 'Active Challenge') {
          const elapsed = Math.floor((Date.now() - new Date(latest.started_at)) / 86400000) + 1;
          if (elapsed > latest.days) {
            const upd = await setRunStatus(latest.id, 'Completed Challenge');
            if (upd) runs = [upd, ...runs.slice(1)];
          }
        }
        if (!active) return;
        const current = runs[0] || null;
        const completed = runs.filter((r) => r.status === 'Completed Challenge');
        setState((s) => ({
          ...s,
          completedCount: completed.length,
          longCompletedCount: completed.filter((r) => r.days >= 21).length,
          ...(current?.status === 'Active Challenge'
            ? {
                participating: true,
                days: current.days,
                started: true,
                startDate: current.started_at,
                status: 'Active Challenge',
                runId: current.id,
              }
            : { started: false, status: current?.status || null, runId: null }),
        }));
      } catch {
        /* offline / not signed in — keep the local mirror as-is */
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    const patch = (p) => setState((s) => ({ ...s, ...p }));
    return {
      ...state,
      enterLevel2: () => setState((s) => (s.unlocked ? s : { ...s, unlocked: true })),
      setParticipating: (participating) =>
        setState((s) => ({ ...s, participating, ...(participating ? {} : { days: null }) })),
      setDays: (days) => patch({ days }),
      startChallenge: () => {
        patch({ started: true, startDate: new Date().toISOString(), status: 'Active Challenge' });
        // Persist the run as a DB row; attach its id once created. (`state` is
        // fresh here — this useMemo recomputes on every state change.)
        startRun(state.days)
          .then((row) => row && patch({ runId: row.id, startDate: row.started_at }))
          .catch(() => {});
      },
      resetChallenge: () => {
        setState((s) => {
          if (s.runId) setRunStatus(s.runId, 'Abandoned').catch(() => {});
          return {
            ...DEFAULT,
            unlocked: true,
            completedCount: s.completedCount,
            longCompletedCount: s.longCompletedCount,
          };
        });
      },
    };
  }, [state, setState]);

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenge must be used within <ChallengeProvider>');
  return ctx;
}
