import { call, getSession, setSession, clearSession, isConfigured } from '@/lib/gsApi';
import { mapProfile } from '@/utils/mappers';
import { normalizeRole } from '@/utils/roles';
import { demoUser } from '@/data/mockData';

/**
 * Auth service backed by the Google Apps Script web app (users/sessions sheets
 * in the _System spreadsheet — see backend/gsheets/Code.gs).
 *
 * Public surface (kept IDENTICAL to the Supabase branch so no page changes):
 *   login({ email, password, role }) -> { token, user }
 *   register({ name, email, phone, password }) -> { token, user, pending, needsEmailConfirmation }
 *   requestPasswordResetCode(email)  -> { exists, message? }
 *   verifyPasswordResetCode(email,code) -> { ok, session }
 *   updatePassword(newPassword)      -> { message }
 *   getCurrentUser()                 -> profile | null
 *   logout()
 *
 * Differences vs Supabase (deliberate, this branch is an experiment):
 *   - signup email-OTP confirmation is SKIPPED (register returns
 *     needsEmailConfirmation:false, so Register.jsx goes straight to /login).
 *     verifySignupCode/resendSignupCode stay exported as no-ops.
 *   - password reset still uses an emailed 6-digit code (MailApp, ~100
 *     emails/day quota). The "recovery session" is a one-time reset token kept
 *     in sessionStorage until the new password is saved.
 *
 * When VITE_API_BASE_URL is missing we fall back to the same demo responses
 * as before so the UI stays explorable offline.
 */

const ROLE_MISMATCH = "This account isn't a {role}. Please pick the correct role and try again.";

const DEMO_ADMIN_EMAILS = ['admin@unleashed.in', 'alex.morgan@unleashed.in'];
const DEMO_CONSULTANT_EMAILS = ['consultant@unleashed.in', 'priya.nair@unleashed.in'];

// "Recovery session": proof that the user typed a valid reset code, pending
// the new password. sessionStorage (like the auth session) — survives F5 only.
const RECOVERY_KEY = 'gs.recovery';

const readRecovery = () => {
  try {
    return JSON.parse(sessionStorage.getItem(RECOVERY_KEY)) || null;
  } catch {
    return null;
  }
};

/** Is a password reset mid-flight? (ResetPassword.jsx gates on this.) */
export function hasRecoverySession() {
  return Boolean(readRecovery()?.resetToken);
}

/** Abandon the in-progress reset (leaving the page, Back to login, …). */
export function clearRecoverySession() {
  sessionStorage.removeItem(RECOVERY_KEY);
}

export async function login({ email, password, role }) {
  if (!isConfigured) {
    const e = (email || '').trim().toLowerCase();
    let resolved = role || 'client';
    if (DEMO_ADMIN_EMAILS.includes(e)) resolved = 'admin';
    else if (DEMO_CONSULTANT_EMAILS.includes(e)) resolved = 'consultant';
    return {
      token: 'demo.jwt.token',
      user: { ...demoUser, email, role: resolved, status: 'Approved' },
    };
  }

  const data = await call('/login', { email: (email || '').trim(), password }, { auth: false });
  const profile = mapProfile(data.user);

  if (role && normalizeRole(profile.role) !== normalizeRole(role)) {
    throw new Error(ROLE_MISMATCH.replace('{role}', role));
  }

  setSession({ token: data.token, user: profile });
  return { token: data.token, user: profile };
}

/**
 * Pre-signup check: is this email or phone already registered? Server-side
 * lookup against the users sheet — returns only booleans, same as the old
 * signup_availability RPC.
 */
export async function checkSignupAvailability(email, phone) {
  if (!isConfigured) return { emailTaken: false, phoneTaken: false };
  const data = await call(
    '/availability',
    { email: (email || '').trim(), phone: (phone || '').trim() },
    { auth: false }
  );
  return { emailTaken: !!data?.email_taken, phoneTaken: !!data?.phone_taken };
}

export async function register({ name, email, phone, password }) {
  if (!isConfigured) {
    return {
      pending: true,
      message: 'Registration received. Your account is pending admin approval.',
      user: { ...demoUser, name, email, phone, role: 'client', status: 'Pending' },
    };
  }

  const data = await call(
    '/signup',
    { name, email: (email || '').trim(), phone: (phone || '').trim(), password },
    { auth: false }
  );

  // No auto-login and (on this branch) no email confirmation step — the user
  // goes straight back to the login page.
  return {
    token: null,
    user: mapProfile(data?.user),
    pending: true,
    needsEmailConfirmation: false,
  };
}

/** Signup email confirmation is skipped on the Sheets branch — kept as no-ops
 *  so Register.jsx compiles unchanged (it never reaches the code step). */
export async function verifySignupCode() {
  return { ok: true };
}
export async function resendSignupCode() {
  return { ok: true };
}

/**
 * Step 1 of the code-based reset. Returns { exists:false } when no account uses
 * this email; otherwise the script emails a 6-digit code (MailApp).
 */
export async function requestPasswordResetCode(email) {
  const clean = (email || '').trim();
  if (!isConfigured) {
    return { exists: true, message: 'A reset code has been sent (demo).' };
  }
  const data = await call('/requestReset', { email: clean }, { auth: false });
  return { exists: !!data?.exists };
}

/**
 * Step 2: verify the 6-digit code. On success the server swaps it for a
 * one-time reset token, which we keep as the "recovery session" until
 * updatePassword() consumes it.
 */
export async function verifyPasswordResetCode(email, code) {
  if (!isConfigured) return { ok: true };
  const clean = (email || '').trim();
  const data = await call('/verifyReset', { email: clean, code: (code || '').trim() }, { auth: false });
  try {
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ email: clean, resetToken: data.resetToken }));
  } catch {
    /* ignore */
  }
  return { ok: true, session: null };
}

/** Set the new password using the stored reset token, then make them log in fresh. */
export async function updatePassword(newPassword) {
  if (!isConfigured) {
    return { message: 'Password updated.' };
  }
  const rec = readRecovery();
  if (!rec?.resetToken) {
    throw new Error('This reset has expired — request a new code from Forgot Password.');
  }
  const data = await call(
    '/updatePassword',
    { email: rec.email, resetToken: rec.resetToken, password: newPassword },
    { auth: false }
  );
  clearRecoverySession();
  clearSession(); // the server killed all sessions for this account anyway
  return { message: data?.message || 'Password updated. Please log in with your new password.' };
}

/**
 * Start changing the signed-in user's email: the script emails a 6-digit code
 * to the NEW address; the change applies once verifyEmailChange() succeeds.
 */
export async function requestEmailChange(newEmail) {
  if (!isConfigured) return { ok: true };
  await call('/requestEmailChange', { newEmail: (newEmail || '').trim() });
  return { ok: true };
}

/** Confirm the email change with the 6-digit code sent to the new address. */
export async function verifyEmailChange(newEmail, code) {
  if (!isConfigured) return { ok: true };
  await call('/verifyEmailChange', { newEmail: (newEmail || '').trim(), code: (code || '').trim() });
  // Refresh the cached profile so the app shows the new email immediately.
  try {
    const me = await call('/me');
    const s = getSession();
    if (s) setSession({ token: s.token, user: mapProfile(me) });
  } catch {
    /* non-fatal: email already changed server-side */
  }
  return { ok: true };
}

export async function getCurrentUser() {
  if (!isConfigured) return demoUser;
  if (!getSession()?.token) return null;
  const me = await call('/me');
  return mapProfile(me);
}

export async function logout() {
  if (!isConfigured) return;
  try {
    await call('/logout');
  } catch {
    /* the local session is cleared regardless */
  }
  clearSession();
}
