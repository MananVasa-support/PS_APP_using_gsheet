import { useCallback, useRef, useState, useEffect } from 'react';
import { unwrapError } from '@/lib/supabase';

/**
 * Generic mutation hook (create/update/delete) with loading + error state.
 *
 * @param {(args: any) => Promise<any>} fn     - the mutation function
 * @param {{ onSuccess?: (data, args) => void, onError?: (err, args) => void }} cb
 *
 * Returns { mutate, loading, error, reset }
 *
 * Usage:
 *   const { mutate: createEntry, loading } = useSupabaseMutation(
 *     (data) => timeService.createEntry(data),
 *     { onSuccess: () => refetch() }
 *   );
 *   await createEntry({ task: '...', category: 'Productive' });
 */
export function useSupabaseMutation(fn, { onSuccess, onError } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(args);
        if (onSuccess) onSuccess(result, args);
        return result;
      } catch (err) {
        const normalized = unwrapError(err);
        if (mountedRef.current) setError(normalized);
        if (onError) onError(normalized, args);
        throw normalized;
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [fn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { mutate, loading, error, reset };
}

export default useSupabaseMutation;
