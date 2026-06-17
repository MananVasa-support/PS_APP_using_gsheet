import { useCallback, useEffect, useState } from 'react';
import { listEntries, saveEntry, deleteEntry } from '@/services/personalSpaceService';

/**
 * Backing store for a running-log tool: hydrates the entry list once, then
 * exposes add/remove that optimistically update the list and persist.
 */
export function useLog(tool, summarize) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const list = await listEntries(tool).catch(() => []);
      if (active) {
        setEntries(list);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tool]);

  const add = useCallback(
    async (data) => {
      const saved = await saveEntry(tool, { data }, summarize);
      setEntries((list) => [saved, ...list]);
      return saved;
    },
    [tool, summarize]
  );

  const update = useCallback(
    async (id, data, created_at) => {
      setEntries((list) => list.map((e) => (e.id === id ? { ...e, data } : e)));
      await saveEntry(tool, { id, data, created_at }, summarize).catch(() => {});
    },
    [tool, summarize]
  );

  const remove = useCallback(
    async (id) => {
      setEntries((list) => list.filter((e) => e.id !== id));
      await deleteEntry(tool, id).catch(() => {});
    },
    [tool]
  );

  return { entries, loading, add, update, remove };
}
