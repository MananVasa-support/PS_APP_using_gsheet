// COMPATIBILITY SHIM — Supabase is GONE on this branch (gsheets-backend).
//
// The real backend is a Google Apps Script web app + Google Sheets (see
// src/lib/gsApi.js and backend/gsheets/Code.gs). This file keeps the same
// exports the rest of the app has always imported:
//
//   isConfigured  — true when VITE_API_BASE_URL is set (was: Supabase env vars)
//   unwrapError   — unchanged error normalizer
//   supabase      — a MINIMAL stand-in:
//       supabase.auth.getSession / onAuthStateChange / signOut work, backed by
//       the Sheets session (several services only ever used auth.getSession()
//       to learn the user id). EVERYTHING ELSE (.from, .rpc, .storage,
//       .channel, .functions) throws — exactly like the legacy services'
//       calls against tables/RPCs that never existed in schema.sql behaved on
//       the Supabase branch.
//
// New code should import from '@/lib/gsApi' directly, not from here.

import { getSession, onAuthChange, clearSession, isConfigured as configured } from './gsApi';

export const isConfigured = configured;

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

// Shape a gsApi session like a Supabase session: { access_token, user: { id } }.
const toSupabaseSession = (s) =>
  s?.token ? { access_token: s.token, user: { id: s.user?.id, email: s.user?.email } } : null;

const auth = {
  async getSession() {
    return { data: { session: toSupabaseSession(getSession()) } };
  },
  onAuthStateChange(callback) {
    const unsubscribe = onAuthChange((event, s) => callback(event, toSupabaseSession(s)));
    return { data: { subscription: { unsubscribe } } };
  },
  async signOut() {
    clearSession();
    return { error: null };
  },
};

function notAvailable(api) {
  return () => {
    throw new Error(
      `[supabase shim] ${api} is not available on the Google Sheets backend — use '@/lib/gsApi' instead.`
    );
  };
}

export const supabase = {
  auth,
  from: notAvailable('supabase.from()'),
  rpc: notAvailable('supabase.rpc()'),
  channel: notAvailable('supabase.channel()'),
  removeChannel: () => {},
  storage: { from: notAvailable('supabase.storage') },
  functions: { invoke: notAvailable('supabase.functions') },
};
