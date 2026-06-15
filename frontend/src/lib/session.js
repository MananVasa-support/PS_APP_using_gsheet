/**
 * App session store — NOT a backend, just where the signed-in user + token
 * live for the current browser tab.
 *
 * Used by the Supabase auth layer (authService / AuthContext / userService):
 * after a Supabase login, authService.setSession({ token, user }) stores it
 * here; the session lives in sessionStorage, so a refresh (F5) keeps the user
 * logged in but a fresh launch / closed tab starts logged-out.
 *
 * This file has nothing to do with any tool-data backend — it is pure session
 * state, kept separate so auth never depends on storage internals.
 */

const SESSION_KEY = 'gs.session'; // { token, user: { id, name, email, ... } }
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

/** Random id (session tokens, etc.). */
export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
