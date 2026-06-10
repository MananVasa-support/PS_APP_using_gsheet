import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { mapProfile } from '@/utils/mappers';
import * as authService from '@/services/authService';
import { isAdmin, isConsultant, isClient } from '@/utils/roles';

const AuthContext = createContext(null);

/**
 * Auth provider — owns the Supabase session, the merged profile, and the
 * login/register/logout helpers. Subscribes to `onAuthStateChange` so the
 * UI reflects sign-ins/outs from any tab automatically.
 *
 * Shape exposed to consumers:
 *   { user, session, token, loading, isAuthenticated, isAdmin, isConsultant,
 *     isClient, role, login, register, logout, applySession, setUser }
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  // Start in loading=true so ProtectedRoute waits for the initial session check
  // before deciding to redirect to /login.
  const [loading, setLoading] = useState(true);
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
          // signed in. Drop any legacy localStorage session from older builds so
          // it no longer auto-logs the demo user back in.
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
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (!mountedRef.current) return;
        setSession(s);
        if (s?.user?.id) {
          const profile = await fetchProfile(s.user.id);
          if (!mountedRef.current) return;
          if (!profile) {
            // The session points to an account with no profile (e.g. it was
            // deleted). Don't strand the user on a broken "?" dashboard — clear
            // the stale session so they land back on the login page.
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setUser(profile);
          }
        }
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

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mountedRef.current) return;
      setSession(s);
      if (!s?.user?.id) {
        setUser(null);
        return;
      }
      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        const profile = await fetchProfile(s.user.id);
        if (!mountedRef.current) return;
        if (!profile) {
          // Account/profile no longer exists — clear the stale session instead
          // of showing a half-logged-in "?" state.
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setUser(profile);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Mirror demo-mode user into sessionStorage so a refresh keeps them signed in
  // for the current tab only. Closing the tab / a new launch starts logged-out.
  useEffect(() => {
    if (isConfigured) return; // Supabase manages its own persistence
    if (user) sessionStorage.setItem('ta_user', JSON.stringify(user));
    else sessionStorage.removeItem('ta_user');
  }, [user]);

  async function fetchProfile(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('[auth] failed to load profile', error);
      return null;
    }
    return mapProfile(data);
  }

  const login = useCallback(async (credentials) => {
    setLoading(true);
    try {
      const result = await authService.login(credentials);
      // onAuthStateChange will also fire — pre-set so the caller can navigate immediately.
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
      if (result.user) setUser(result.user);
      if (result.token) setSession({ access_token: result.token });
      return result.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setSession(null);
  }, []);

  /**
   * Commit an already-fetched session into context. Used by flows that obtain
   * the user/token outside the regular login() path (e.g. confirmation screens
   * after registration).
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
      login,
      register,
      logout,
      applySession,
      setUser,
    }),
    [user, session, loading, login, register, logout, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within <AuthProvider>');
  return ctx;
}
