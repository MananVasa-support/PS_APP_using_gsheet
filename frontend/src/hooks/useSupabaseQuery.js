import { useCallback, useEffect, useRef, useState } from 'react';
import { unwrapError } from '@/lib/supabase';

/**
 * Generic data-fetching hook with loading + error + refetch.
 *
 * @param {() => Promise<any>} fn       - async function returning the data
 * @param {Array} deps                  - dependency array (re-runs when changed)
 * @param {{ initialData?: any, enabled?: boolean }} options
 *
 * Returns { data, loading, error, refetch, setData }
 *
 * Usage:
 *   const { data: entries, loading, error, refetch } = useSupabaseQuery(
 *     () => timeService.getEntries(),
 *     []
 *   );
 */
export function useSupabaseQuery(fn, deps = [], { initialData = null, enabled = true } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      if (mountedRef.current) setData(result);
      return result;
    } catch (err) {
      const normalized = unwrapError(err);
      if (mountedRef.current) setError(normalized);
      throw normalized;
      // eslint-disable-next-line no-unreachable
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!enabled) return;
    run().catch(() => {
      /* error already captured */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error, refetch: run, setData };
}

export default useSupabaseQuery;
