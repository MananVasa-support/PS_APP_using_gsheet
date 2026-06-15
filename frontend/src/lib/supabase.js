// COMPATIBILITY SHIM for the legacy services.
//
// Real auth runs through Supabase (see lib/supabaseAuth.js + services/
// authService.js). This file only keeps the small surface the ~12 legacy
// services (admin/consultant/time/report/form/analytics…) still import:
//
//   isConfigured  — tool-data backend present? Google Sheets storage was
//                   removed, so this is FALSE: every gated service uses its
//                   localStorage/mock demo path.
//   unwrapError   — error normalizer (unchanged)
//   supabase      — a MINIMAL stand-in: auth.getSession/onAuthStateChange/
//                   signOut work off the app session store; .from/.rpc/etc.
//                   throw (those tables/RPCs never existed for these services).

import { getSession, onAuthChange, clearSession } from './session';

// Tool-data backend present when the Apps Script Web App URL is set; otherwise
// every gated service/context falls back to its localStorage demo path.
export const isConfigured = Boolean(import.meta.env.VITE_API_BASE_URL);

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

// Shape the app session like a Supabase session: { access_token, user: { id } }.
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
    throw new Error(`[supabase shim] ${api} is not available.`);
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
