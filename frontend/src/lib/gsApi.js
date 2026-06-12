/**
 * Google Sheets backend client — the ONLY place the frontend talks to the
 * Apps Script web app (VITE_API_BASE_URL in frontend/.env).
 *
 * Transport notes (Apps Script quirks):
 *  - POST body is sent as text/plain so the browser skips the CORS preflight
 *    (Apps Script web apps can't answer OPTIONS). JSON goes in the body, and
 *    the session token rides INSIDE the body (custom headers would also
 *    trigger a preflight).
 *  - The /exec URL 302-redirects to script.googleusercontent.com; fetch
 *    follows it automatically.
 *
 * Session model (mirrors the Supabase branch's middle-ground persistence):
 *  the token+user live in sessionStorage, so F5 keeps you logged in but a
 *  fresh launch starts at the login page.
 *
 * Timing logs (for the Supabase-vs-Sheets comparison): every request logs
 *  `[gs-api] /route … 842ms` and is recorded; run  window.apiTimings()  in
 *  the console for a console.table of every call this session.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const isConfigured = Boolean(API_BASE);

const SESSION_KEY = 'gs.session'; // sessionStorage: { token, user }

// ── Session store + auth-change events ──────────────────────────────────────
let listeners = [];

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token || null;
}

function emit(event, session) {
  listeners.forEach((cb) => {
    try {
      cb(event, session);
    } catch {
      /* a bad listener must not break auth */
    }
  });
}

export function setSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota */
  }
  emit('SIGNED_IN', session);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  emit('SIGNED_OUT', null);
}

/** Update the cached user object (e.g. after a profile edit) without re-login. */
export function patchSessionUser(user) {
  const s = getSession();
  if (!s) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, user }));
  } catch {
    /* ignore */
  }
}

/** Subscribe to SIGNED_IN / SIGNED_OUT. Returns an unsubscribe function. */
export function onAuthChange(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

// ── Timing log ───────────────────────────────────────────────────────────────
const timings = [];

function logTiming(entry) {
  timings.push(entry);
  // eslint-disable-next-line no-console
  console.log(
    `%c[gs-api]%c ${entry.route}${entry.detail ? ` ${entry.detail}` : ''} … ${entry.ms}ms` +
      (entry.serverMs != null ? ` (server ${entry.serverMs}ms)` : '') +
      (entry.ok ? '' : ' ✗ FAILED'),
    'color:#0a7d32;font-weight:bold',
    entry.ok ? '' : 'color:#c00'
  );
}

if (typeof window !== 'undefined') {
  // For the speed comparison vs Supabase: console.table of every call.
  window.apiTimings = () => {
    // eslint-disable-next-line no-console
    console.table(timings.map(({ route, detail, ms, serverMs, ok, at }) => ({ route, detail, ms, serverMs, ok, at })));
    return `${timings.length} request(s) this session`;
  };
}

// ── Core call ────────────────────────────────────────────────────────────────
const RETRYABLE = /quota|rate.?limit|too many|service invoked too many times|timed?.?out|429|503/i;
const MAX_RETRIES = 2;

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * POST one JSON request to the Apps Script router.
 * @param {string} route   e.g. '/login', '/list'
 * @param {object} payload route params (token is attached automatically)
 * @param {object} opts    { auth: false } to skip attaching the token
 */
export async function call(route, payload = {}, opts = {}) {
  if (!isConfigured) {
    throw new ApiError('Backend not configured — set VITE_API_BASE_URL in frontend/.env', 'NOT_CONFIGURED');
  }
  const body = { route, ...payload };
  if (opts.auth !== false && body.token === undefined) {
    body.token = getToken();
  }

  const detail = [payload.tool, payload.sheet || (payload.sheets || []).join('+')].filter(Boolean).join('/');
  const t0 = performance.now();
  let lastErr = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff for Sheets/Apps Script rate-limit hiccups.
      await new Promise((r) => setTimeout(r, 800 * 2 ** (attempt - 1)));
    }
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        // text/plain = "simple request" → no CORS preflight (Apps Script
        // can't answer OPTIONS). The script parses JSON from the raw body.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow',
      });
      const text = await res.text();
      let out;
      try {
        out = JSON.parse(text);
      } catch {
        throw new ApiError(
          res.ok ? 'Unexpected non-JSON response from the Apps Script.' : `Backend HTTP ${res.status}`,
          'BAD_RESPONSE',
          res.status
        );
      }
      if (!out.ok) {
        const err = new ApiError(out.error?.message || 'Request failed.', out.error?.code, res.status);
        // An invalid/expired session means we're logged out — reflect it.
        if (err.code === 'AUTH_INVALID') clearSession();
        // Server-reported quota/rate errors are worth retrying.
        if (RETRYABLE.test(err.message) && attempt < MAX_RETRIES) {
          lastErr = err;
          continue;
        }
        logTiming({ route, detail, ms: Math.round(performance.now() - t0), serverMs: out.ms ?? null, ok: false, at: new Date().toLocaleTimeString() });
        throw err;
      }
      logTiming({ route, detail, ms: Math.round(performance.now() - t0), serverMs: out.ms ?? null, ok: true, at: new Date().toLocaleTimeString() });
      return out.data;
    } catch (err) {
      if (err instanceof ApiError && !RETRYABLE.test(err.message)) throw err;
      lastErr = err; // network/CORS hiccup or retryable error — try again
    }
  }

  logTiming({ route, detail, ms: Math.round(performance.now() - t0), serverMs: null, ok: false, at: new Date().toLocaleTimeString() });
  throw lastErr instanceof ApiError
    ? lastErr
    : new ApiError(lastErr?.message || 'Could not reach the backend.', 'NETWORK');
}

/** Client-side uuid for new rows (the Sheets backend never generates ids). */
export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
