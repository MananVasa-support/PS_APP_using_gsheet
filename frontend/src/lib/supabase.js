// Supabase client. When the two env vars are present (see frontend/.env), this
// exports a real client and `isConfigured=true`, flipping the whole app from the
// offline/localStorage demo path onto the real database + auth. When they're
// absent, it falls back to a throwing stub so offline/demo mode still compiles
// (every service gates on `isConfigured` and uses localStorage in that case).

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Auto-login OFF: the session is kept in memory only (not saved to the
        // browser), so every fresh launch / reload / dev re-run starts at the
        // login page instead of jumping straight to the dashboard. Set back to
        // `true` to restore "stay logged in across restarts".
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : new Proxy(
      {},
      {
        get() {
          throw new Error(
            '[supabase] not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env'
          );
        },
      }
    );

export function unwrapError(err) {
  if (!err) return null;
  if (err instanceof Error) return err;
  const message = err.message || err.error_description || err.error || 'Unexpected error';
  const e = new Error(message);
  e.code = err.code;
  e.status = err.status;
  e.details = err.details;
  return e;
}
