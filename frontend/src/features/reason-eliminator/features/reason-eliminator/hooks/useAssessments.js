import { useCallback, useEffect, useState } from 'react';
import reasonEliminatorService from '../services/reasonEliminatorService.js';

export default function useAssessments() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const list = reasonEliminatorService.listSessions();
    setSessions(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    (id) => {
      reasonEliminatorService.deleteSession(id);
      refresh();
    },
    [refresh]
  );

  const clearAll = useCallback(() => {
    reasonEliminatorService.clearAll();
    refresh();
  }, [refresh]);

  return {
    sessions,
    loading,
    refresh,
    remove,
    clearAll,
  };
}
