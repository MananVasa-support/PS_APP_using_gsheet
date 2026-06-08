import { useEffect } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';

/**
 * Subscribe to Postgres changes on a table and run a callback on every event.
 *
 * @param {string} table    - public.<table> name
 * @param {(payload: any) => void} onChange
 * @param {{ event?: 'INSERT'|'UPDATE'|'DELETE'|'*', filter?: string, schema?: string }} options
 *
 * Usage:
 *   useRealtime('time_entries', (payload) => refetch(), {
 *     filter: `user_id=eq.${userId}`,
 *   });
 */
export function useRealtime(table, onChange, { event = '*', filter, schema = 'public' } = {}) {
  useEffect(() => {
    if (!isConfigured) return undefined;
    if (!table || !onChange) return undefined;

    const channelName = `realtime:${schema}:${table}:${filter || 'all'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload) => onChange(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, event, filter, schema]);
}

export default useRealtime;
