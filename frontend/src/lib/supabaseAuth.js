/**
 * Supabase AUTH client — the ONLY thing on this branch that talks to Supabase.
 *
 * Scope: identity only. The `_System` users data now lives in a Supabase
 * Postgres table (`app_users`) reached through SECURITY DEFINER RPCs, so the
 * password hash/salt never leave the database. EVERYTHING ELSE (all 5 tools'
 * data + the `_meta` Drive id cache) still lives in Google Sheets via gsApi.js
 * — this file does not touch any of that.
 *
 * Transport: plain fetch to PostgREST's /rest/v1/rpc/<fn> (no SDK dependency).
 * The anon key is sent as both apikey and Bearer, exactly like supabase-js.
 *
 * Config (frontend/.env):
 *   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon public key>
 * When either is missing, isSupabaseConfigured=false and the auth service
 * falls back to its offline/demo path.
 *
 * Timing logs (for the speed comparison): every RPC logs `[supabase] app_login
 * … 142ms`; these also feed window.apiTimings() alongside the Sheets calls.
 */

const URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(URL && ANON);

// ── timing log (mirrors gsApi's, shared console table) ───────────────────────
const timings = [];
function logTiming(entry) {
  timings.push(entry);
  // eslint-disable-next-line no-console
  console.log(
    `%c[supabase]%c ${entry.op} … ${entry.ms}ms${entry.ok ? '' : ' ✗ FAILED'}`,
    'color:#3ecf8e;font-weight:bold',
    entry.ok ? '' : 'color:#c00'
  );
}
if (typeof window !== 'undefined') {
  const prev = window.apiTimings;
  window.supabaseTimings = () => {
    // eslint-disable-next-line no-console
    console.table(timings);
    return `${timings.length} supabase request(s) this session`;
  };
  // Keep window.apiTimings (gsApi) working; add supabase rows when both exist.
  if (typeof prev === 'function') {
    window.apiTimings = () => {
      prev();
      return window.supabaseTimings();
    };
  }
}

export class AuthApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Call a Postgres RPC. Returns the function's JSON result (object for scalar
 * `json` returns, array for `setof json`). Throws AuthApiError on failure with
 * the database's RAISE message (e.g. "Invalid email or password.").
 */
async function rpc(fn, args = {}) {
  if (!isSupabaseConfigured) {
    throw new AuthApiError('Supabase is not configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).', 'NOT_CONFIGURED');
  }
  const t0 = performance.now();
  let res;
  let data;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    data = await res.json().catch(() => null);
  } catch (e) {
    logTiming({ op: fn, ms: Math.round(performance.now() - t0), ok: false, at: new Date().toLocaleTimeString() });
    throw new AuthApiError('Could not reach Supabase. Check your connection.', 'NETWORK');
  }
  const ms = Math.round(performance.now() - t0);
  if (!res.ok) {
    // PostgREST error shape: { code, message, details, hint }
    const message = data?.message || data?.error_description || `Supabase request failed (HTTP ${res.status}).`;
    logTiming({ op: fn, ms, ok: false, at: new Date().toLocaleTimeString() });
    throw new AuthApiError(message, data?.code, res.status);
  }
  logTiming({ op: fn, ms, ok: true, at: new Date().toLocaleTimeString() });
  return data;
}

// ── Auth + CRUD wrappers (one per Postgres function) ─────────────────────────
export const appLogin = (email, password) =>
  rpc('app_login', { p_email: (email || '').trim(), p_password: password });

export const appSignup = ({ name, email, phone, country, password }) =>
  rpc('app_signup', {
    p_name: (name || '').trim(),
    p_email: (email || '').trim(),
    p_phone: (phone || '').trim(),
    p_country: (country || '').trim(),
    p_password: password,
  });

export const appAvailability = (email, phone) =>
  rpc('app_availability', { p_email: (email || '').trim(), p_phone: (phone || '').trim() });

export const appGetUser = (id) => rpc('app_get_user', { p_id: id });

export const appUpdateProfile = (id, patch) => rpc('app_update_profile', { p_id: id, p_patch: patch });

export const appDeleteUser = (id) => rpc('app_delete_user', { p_id: id });

/** All users (public profiles, no hashes) — admin/consultant lists + leaderboard.
 *  Returns [] when Supabase isn't configured so callers degrade gracefully. */
export const appListUsers = async () => {
  if (!isSupabaseConfigured) return [];
  const rows = await rpc('app_list_users');
  return Array.isArray(rows) ? rows : [];
};
