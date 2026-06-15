import {
  isSupabaseConfigured,
  appLogin,
  appSignup,
  appAvailability,
  appGetUser,
} from '@/lib/supabaseAuth';
import { getSession, setSession, clearSession, patchSessionUser, newId } from '@/lib/session';
import { mapProfile } from '@/utils/mappers';
import { normalizeRole } from '@/utils/roles';
import { demoUser } from '@/data/mockData';

/**
 * Auth service — IDENTITY ONLY, backed by Supabase (the `app_users` table +
 * SECURITY DEFINER RPCs; see backend/supabase-auth/schema.sql): login, signup,
 * availability, profile reads. Tool data is stored separately (browser
 * localStorage in the tool services) — auth doesn't touch it.
 *
 * The session token is a client-minted `sess-<uuid>` in sessionStorage
 * (F5 keeps login, fresh launch starts at login) — Supabase here is a data
 * store for the user row, not a JWT session provider, so the app session model
 * is owned by lib/session.js.
 *
 * Public surface kept IDENTICAL so no page changes. Flows needing an email
 * server (password reset, email change, signup OTP) stay stubbed.
 *
 * Demo fallback: when Supabase isn't configured, returns the same mock
 * responses as before so the UI stays explorable offline.
 */

const ROLE_MISMATCH = "This account isn't a {role}. Please pick the correct role and try again.";

const DEMO_ADMIN_EMAILS = ['admin@unleashed.in', 'alex.morgan@unleashed.in'];
const DEMO_CONSULTANT_EMAILS = ['consultant@unleashed.in', 'priya.nair@unleashed.in'];

const NO_SERVER_MSG =
  'Not available in this demo (it needs an email server). Create a new account instead.';

export async function login({ email, password, role }) {
  if (!isSupabaseConfigured) {
    const e = (email || '').trim().toLowerCase();
    let resolved = role || 'client';
    if (DEMO_ADMIN_EMAILS.includes(e)) resolved = 'admin';
    else if (DEMO_CONSULTANT_EMAILS.includes(e)) resolved = 'consultant';
    return {
      token: 'demo.jwt.token',
      user: { ...demoUser, email, role: resolved, status: 'Approved' },
    };
  }

  // Supabase verifies the SHA-256+salt hash server-side and returns the public
  // profile (never the hash). Bad credentials → the RPC raises and we throw.
  const profile = mapProfile(await appLogin(email, password));
  if (role && normalizeRole(profile.role) !== normalizeRole(role)) {
    throw new Error(ROLE_MISMATCH.replace('{role}', role));
  }

  const token = `sess-${newId()}`;
  setSession({ token, user: profile });
  return { token, user: profile };
}

/** Pre-signup duplicate check (booleans only) against app_users. */
export async function checkSignupAvailability(email, phone) {
  if (!isSupabaseConfigured) return { emailTaken: false, phoneTaken: false };
  const data = await appAvailability(email, phone);
  return { emailTaken: !!data?.email_taken, phoneTaken: !!data?.phone_taken };
}

export async function register({ name, email, phone, password }) {
  if (!isSupabaseConfigured) {
    return {
      pending: true,
      message: 'Registration received. Your account is pending admin approval.',
      user: { ...demoUser, name, email, phone, role: 'client', status: 'Pending' },
    };
  }

  // app_signup hashes server-side, blocks duplicate email/phone, returns the
  // public profile. The user's Google Drive tool space is NOT created here —
  // it auto-provisions the first time they open a tool (keeps signup instant
  // and free of a Google popup; identity and tool-data stay cleanly separate).
  const profile = mapProfile(await appSignup({ name, email, phone, password }));

  // No auto-login, no email confirmation — straight back to the login page.
  return { token: null, user: profile, pending: true, needsEmailConfirmation: false };
}

/** Signup email confirmation isn't used here — kept as no-ops so Register.jsx
 *  compiles unchanged (it never reaches the code step). */
export async function verifySignupCode() {
  return { ok: true };
}
export async function resendSignupCode() {
  return { ok: true };
}

// ── Password reset / email change — need an email server; stubbed ───────────
export async function requestPasswordResetCode(email) {
  if (!isSupabaseConfigured) return { exists: true, message: 'A reset code has been sent (demo).' };
  void email;
  throw new Error(NO_SERVER_MSG);
}
export async function verifyPasswordResetCode() {
  if (!isSupabaseConfigured) return { ok: true };
  throw new Error(NO_SERVER_MSG);
}
export async function updatePassword() {
  if (!isSupabaseConfigured) return { message: 'Password updated.' };
  throw new Error(NO_SERVER_MSG);
}
export function hasRecoverySession() {
  return false;
}
export function clearRecoverySession() {}

export async function requestEmailChange() {
  if (!isSupabaseConfigured) return { ok: true };
  throw new Error(NO_SERVER_MSG);
}
export async function verifyEmailChange() {
  if (!isSupabaseConfigured) return { ok: true };
  throw new Error(NO_SERVER_MSG);
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return demoUser;
  const session = getSession();
  if (!session?.token) return null;
  const row = await appGetUser(session.user?.id);
  if (!row) return null; // account deleted in Supabase → AuthContext signs out
  const profile = mapProfile(row);
  patchSessionUser(profile);
  return profile;
}

export async function logout() {
  if (!isSupabaseConfigured) return;
  clearSession();
}
