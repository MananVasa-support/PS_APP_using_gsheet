import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { mapProfile } from '@/utils/mappers';
import { normalizeRole } from '@/utils/roles';
import { demoUser } from '@/data/mockData';

/**
 * Auth service backed by Supabase Auth + the `profiles` table.
 *
 * Public surface (kept stable so existing pages don't change):
 *   login({ email, password, role }) -> { token, user }
 *   register({ name, email, phone, password }) -> { token, user, pending, needsEmailConfirmation }
 *   requestPasswordResetCode(email)  -> { exists, message? }
 *   verifyPasswordResetCode(email,code) -> { ok, session }
 *   updatePassword(newPassword)      -> { message }
 *   getCurrentUser()                 -> profile | null
 *   logout()
 *
 * When Supabase env vars are missing we fall back to a demo response so the
 * UI is still explorable offline (see src/lib/supabase.js).
 */

const ROLE_MISMATCH =
  "This account isn't a {role}. Please pick the correct role and try again.";

const DEMO_ADMIN_EMAILS = ['admin@unleashed.in', 'alex.morgan@unleashed.in'];
const DEMO_CONSULTANT_EMAILS = ['consultant@unleashed.in', 'priya.nair@unleashed.in'];

async function fetchProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw unwrapError(error);
  return mapProfile(data);
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email: (email || '').trim(),
    password,
  });
  if (error) throw unwrapError(error);

  const profile = await fetchProfileById(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('Your account is missing a profile. Please contact support.');
  }

  if (role && normalizeRole(profile.role) !== normalizeRole(role)) {
    await supabase.auth.signOut();
    throw new Error(ROLE_MISMATCH.replace('{role}', role));
  }

  return { token: data.session?.access_token || null, user: profile };
}

/**
 * Pre-signup check: is this email or phone already registered? Uses a
 * SECURITY DEFINER RPC (`signup_availability`) so the not-logged-in signup form
 * can ask without being able to read any actual profile data. Returns booleans.
 */
export async function checkSignupAvailability(email, phone) {
  if (!isConfigured) return { emailTaken: false, phoneTaken: false };
  const { data, error } = await supabase.rpc('signup_availability', {
    p_email: (email || '').trim(),
    p_phone: (phone || '').trim(),
  });
  if (error) throw unwrapError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return { emailTaken: !!row?.email_taken, phoneTaken: !!row?.phone_taken };
}

export async function register({ name, email, phone, password }) {
  if (!isConfigured) {
    return {
      pending: true,
      message: 'Registration received. Your account is pending admin approval.',
      user: { ...demoUser, name, email, phone, role: 'client', status: 'Pending' },
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: (email || '').trim(),
    password,
    options: {
      data: { name, phone, role: 'client' },
    },
  });
  if (error) {
    const mapped = unwrapError(error);
    const msg = mapped.message || '';
    // Friendly duplicate messages — whether the block comes from Supabase Auth
    // ("user already registered") or from our DB unique indexes firing inside
    // the signup trigger ("profiles_email_unique" / "profiles_phone_unique").
    if (/profiles_phone_unique/i.test(msg)) {
      mapped.message = 'An account already exists with this phone number.';
    } else if (/already\s*(registered|exists)|user already|profiles_email_unique|duplicate key/i.test(msg)) {
      mapped.message = 'An account already exists with this email.';
    }
    throw mapped;
  }

  const profile = data.user ? await fetchProfileById(data.user.id) : null;

  // Do NOT keep the user signed in after registering. With "Confirm email" off,
  // signUp returns an active session (it would auto-log them in); we clear it so
  // they land on the login page and must sign in with their new credentials.
  if (data.session) {
    await supabase.auth.signOut();
  }

  return {
    token: null,
    user: profile,
    pending: true,
    needsEmailConfirmation: !data.session,
  };
}

/**
 * Step 1 of the code-based reset. Returns { exists:false } when no account uses
 * this email (so the UI can say "no account exists with this email"); otherwise
 * sends the recovery email (which carries a 6-digit code) and returns
 * { exists:true }.
 */
export async function requestPasswordResetCode(email) {
  const clean = (email || '').trim();
  if (!isConfigured) {
    return { exists: true, message: 'A reset code has been sent (demo).' };
  }
  const { emailTaken } = await checkSignupAvailability(clean, '');
  if (!emailTaken) return { exists: false };

  const { error } = await supabase.auth.resetPasswordForEmail(clean, {
    // Kept as a fallback so the email's link (if the template still has one)
    // also lands somewhere sensible; the primary path is the typed code.
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
  });
  if (error) throw unwrapError(error);
  return { exists: true };
}

/**
 * Step 2 of the code-based reset. Verifies the 6-digit code from the email; on
 * success Supabase establishes a temporary recovery session, after which
 * updatePassword() can set the new password.
 */
export async function verifyPasswordResetCode(email, code) {
  if (!isConfigured) return { ok: true };
  const { data, error } = await supabase.auth.verifyOtp({
    email: (email || '').trim(),
    token: (code || '').trim(),
    type: 'recovery',
  });
  if (error) {
    const mapped = unwrapError(error);
    if (/expired|invalid|token/i.test(mapped.message || '')) {
      mapped.message = 'That code is invalid or has expired. Request a new one.';
    }
    throw mapped;
  }
  return { ok: true, session: data.session };
}

/**
 * Set a new password for the user who arrived via the reset email link. The
 * recovery session is already active (Supabase processes the link on load), so
 * this just updates the password on that session.
 */
export async function updatePassword(newPassword) {
  if (!isConfigured) {
    return { message: 'Password updated.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw unwrapError(error);
  // Don't leave them logged in on the recovery session — make them sign in
  // fresh with the new password (consistent with the rest of the auth flow).
  await supabase.auth.signOut();
  return { message: 'Password updated. Please log in with your new password.' };
}

export async function getCurrentUser() {
  if (!isConfigured) return demoUser;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;
  return fetchProfileById(session.user.id);
}

export async function logout() {
  if (!isConfigured) return;
  await supabase.auth.signOut();
}
