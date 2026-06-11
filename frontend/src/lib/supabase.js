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
        // Middle-ground persistence: the session lives in sessionStorage, so a
        // REFRESH (F5) keeps the user logged in, but closing the tab/browser or
        // a fresh launch starts at the login page (no auto-login). Swap the
        // storage to window.localStorage to restore "stay logged in forever".
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
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
