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
 *   forgotPassword(email)            -> { message }
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
    if (/already\s*(registered|exists)|user already/i.test(mapped.message || '')) {
      mapped.message = 'An account already exists with this email.';
    }
    throw mapped;
  }

  const profile = data.user ? await fetchProfileById(data.user.id) : null;

  return {
    token: data.session?.access_token || null,
    user: profile,
    pending: true,
    needsEmailConfirmation: !data.session,
  };
}

export async function forgotPassword(email) {
  if (!isConfigured) {
    return { message: `If an account exists for ${email}, a reset link has been sent.` };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
  });
  if (error) throw unwrapError(error);
  return { message: `If an account exists for ${email}, a reset link has been sent.` };
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
