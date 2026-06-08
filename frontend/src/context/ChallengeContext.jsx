import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const ChallengeContext = createContext(null);

const DEFAULT = {
  unlocked: false, // true once the user clicks into Level 2 (reveals ranking sidebar items)
  participating: null, // true | false | null
  days: null, // 7 | 14 | 21 | 30 | custom number
  started: false,
  startDate: null, // ISO string
  status: null, // 'Active Challenge' | 'Completed Challenge'
};

/**
 * Level 2 challenge state, persisted to localStorage so it survives reloads and
 * is shared reactively between the Sidebar (conditional items) and the Level 2
 * pages. In demo mode this is purely client-side; the backend round will sync it.
 */
export function ChallengeProvider({ children }) {
  const [state, setState] = useLocalStorage('ta_challenge', DEFAULT);

  const value = useMemo(() => {
    const patch = (p) => setState((s) => ({ ...s, ...p }));
    return {
      ...state,
      enterLevel2: () => setState((s) => (s.unlocked ? s : { ...s, unlocked: true })),
      setParticipating: (participating) =>
        setState((s) => ({ ...s, participating, ...(participating ? {} : { days: null }) })),
      setDays: (days) => patch({ days }),
      startChallenge: () =>
        patch({ started: true, startDate: new Date().toISOString(), status: 'Active Challenge' }),
      resetChallenge: () => setState({ ...DEFAULT, unlocked: true }),
    };
  }, [state, setState]);

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenge() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenge must be used within <ChallengeProvider>');
  return ctx;
}
