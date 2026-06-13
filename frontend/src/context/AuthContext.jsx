import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured as isConfigured } from '@/lib/supabaseAuth';
import { getSession as getStoredSession, onAuthChange, clearSession } from '@/lib/gsApi';
import * as authService from '@/services/authService';
import { isAdmin, isConsultant, isClient } from '@/utils/roles';

const AuthContext = createContext(null);

/**
 * Auth provider — owns the Google-Sheets-backend session (token in
 * sessionStorage), the user profile, and the login/register/logout helpers.
 * Subscribes to the gsApi auth events so sign-ins/outs triggered anywhere in
 * the app are reflected here.
 *
 * Shape exposed to consumers (UNCHANGED from the Supabase branch):
 *   { user, session, token, loading, isAuthenticated, isAdmin, isConsultant,
 *     isClient, role, authBusy, setAuthBusy, login, register, logout,
 *     applySession, setUser }
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  // Start in loading=true so ProtectedRoute waits for the initial session check
  // before deciding to redirect to /login.
  const [loading, setLoading] = useState(true);
  // True while a short-lived auth flow (signup, reset-code verify) is running.
  // AuthLayout reads this to NOT bounce the user to the dashboard mid-flow.
  const [authBusy, setAuthBusy] = useState(false);
  const mountedRef = useRef(true);

  // Bootstrap the session + subscribe to auth events.
  useEffect(() => {
    mountedRef.current = true;

    async function bootstrap() {
      try {
        if (!isConfigured) {
          // Demo / offline mode. The session lives in sessionStorage (per browser
          // tab) — NOT localStorage — so every fresh launch starts logged-out at
          // the public Landing/Login, while a mid-session refresh keeps the user
          // signed in. Drop any legacy localStorage session from older builds.
          localStorage.removeItem('ta_user');
          const raw = sessionStorage.getItem('ta_user');
          if (raw) {
            try {
              setUser(JSON.parse(raw));
              setSession({ access_token: 'demo.jwt.token' });
            } catch {
              /* ignore */
            }
          }
          return;
        }

        // A password reset that was started but never finished must not leave
        // anything behind — start clean at the login page.
        if (localStorage.getItem('ps_reset_pending') === '1') {
          localStorage.removeItem('ps_reset_pending');
          authService.clearRecoverySession();
        }

        const stored = getStoredSession(); // sessionStorage { token, user }
        if (!stored?.token) return;

        // Trust the stored profile immediately (instant paint), then validate
        // the token against the server in the background — a deleted account or
        // expired session signs out instead of stranding a broken dashboard.
        setUser(stored.user || null);
        setSession({ access_token: stored.token });
        authService
          .getCurrentUser()
          .then((profile) => {
            if (!mountedRef.current) return;
            if (profile) {
              setUser(profile);
            } else {
              // Account row no longer exists in the users sheet — sign out
              // instead of stranding a broken dashboard.
              clearSession();
              setSession(null);
              setUser(null);
            }
          })
          .catch((err) => {
            if (!mountedRef.current) return;
            if (err?.code === 'AUTH_INVALID') {
              setSession(null);
              setUser(null);
            }
            // GOOGLE_TOKEN (expired Google session, no popup allowed at boot)
            // and network hiccups keep the optimistic session — the next
            // clicked action re-opens the consent popup.
          });
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    bootstrap();

    if (!isConfigured) {
      return () => {
        mountedRef.current = false;
      };
    }

    // Reflect sign-ins/outs triggered anywhere (login page, expired token, …).
    const unsubscribe = onAuthChange((event, s) => {
      if (!mountedRef.current) return;
      if (event === 'SIGNED_OUT' || !s?.token) {
        setSession(null);
        setUser(null);
      } else if (event === 'SIGNED_IN') {
        setSession({ access_token: s.token });
        if (s.user) setUser(s.user);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Mirror demo-mode user into sessionStorage so a refresh keeps them signed in
  // for the current tab only. Closing the tab / a new launch starts logged-out.
  useEffect(() => {
    if (isConfigured) return; // gsApi manages its own persistence
    if (user) sessionStorage.setItem('ta_user', JSON.stringify(user));
    else sessionStorage.removeItem('ta_user');
  }, [user]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      if (result.token) setSession({ access_token: result.token });
      return result.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const result = await authService.register(payload);
      // No auto-login after signup (matches the Supabase branch behavior).
      if (result.token) {
        setUser(result.user);
        setSession({ access_token: result.token });
      }
      return result.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    if (!isConfigured) clearSession?.();
    setUser(null);
    setSession(null);
  }, []);

  /**
   * Commit an already-fetched session into context. Used by flows that obtain
   * the user/token outside the regular login() path.
   */
  const applySession = useCallback((next) => {
    if (next?.user) setUser(next.user);
    if (next?.token) setSession({ access_token: next.token });
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      token: session?.access_token || null,
      loading,
      isAuthenticated: Boolean(session?.access_token),
      isAdmin: isAdmin(user?.role),
      isConsultant: isConsultant(user?.role),
      isClient: isClient(user?.role),
      role: user?.role,
      authBusy,
      setAuthBusy,
      login,
      register,
      logout,
      applySession,
      setUser,
    }),
    [user, session, loading, authBusy, login, register, logout, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}
