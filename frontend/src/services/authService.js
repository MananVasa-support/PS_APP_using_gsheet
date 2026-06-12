import {
  isConfigured,
  ensureReady,
  provisionUserDrive,
  listRows,
  upsertRows,
  getSession,
  setSession,
  clearSession,
  patchSessionUser,
  newId,
  sha256,
} from '@/lib/gsApi';
import { mapProfile } from '@/utils/mappers';
import { normalizeRole } from '@/utils/roles';
import { demoUser } from '@/data/mockData';

/**
 * Auth service backed DIRECTLY by the `users` tab of the _System spreadsheet
 * in Google Drive (no server — see lib/gsApi.js). DEMO-GRADE: the password
 * check runs in the browser; anyone with Drive access can read every row.
 * Passwords are still stored as SHA-256(salt+password), never plain.
 *
 * Signup also PROVISIONS the user's Drive structure right away: a folder named
 * "<Name> — <email>" with the five tool spreadsheets inside — so you can watch
 * it appear in Drive the moment an account is created.
 *
 * Public surface kept IDENTICAL to the previous branches so no page changes.
 * Flows that need an email server are stubbed with a clear message:
 * password reset and email change.
 *
 * The FIRST login/register of a session opens the Google consent popup
 * (Sheets + Drive scopes; the same OAuth client as the Calendar export);
 * after that it's silent for about an hour at a time.
 */

const ROLE_MISMATCH = "This account isn't a {role}. Please pick the correct role and try again.";

const DEMO_ADMIN_EMAILS = ['admin@unleashed.in', 'alex.morgan@unleashed.in'];
const DEMO_CONSULTANT_EMAILS = ['consultant@unleashed.in', 'priya.nair@unleashed.in'];

const NO_SERVER_MSG =
  'Not available in the Sheets demo (it needs an email server). Create a new account instead.';

const cleanEmail = (e) => (e || '').trim();
const sameEmail = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

export async function login({ email, password, role }) {
  if (!isConfigured) {
    const e = cleanEmail(email).toLowerCase();
    let resolved = role || 'client';
    if (DEMO_ADMIN_EMAILS.includes(e)) resolved = 'admin';
    else if (DEMO_CONSULTANT_EMAILS.includes(e)) resolved = 'consultant';
    return {
      token: 'demo.jwt.token',
      user: { ...demoUser, email, role: resolved, status: 'Approved' },
    };
  }

  await ensureReady(); // Google popup on first use, then silent
  const users = await listRows('users');
  const row = users.find((u) => sameEmail(u.email, email));
  if (!row) throw new Error('Invalid email or password.');
  const hash = await sha256(String(row.salt || '') + String(password || ''));
  if (hash !== row.password_hash) throw new Error('Invalid email or password.');

  const profile = mapProfile(row);
  if (role && normalizeRole(profile.role) !== normalizeRole(role)) {
    throw new Error(ROLE_MISMATCH.replace('{role}', role));
  }

  const token = `sess-${newId()}`;
  setSession({ token, user: profile });
  return { token, user: profile };
}

/** Pre-signup duplicate check against the users tab (booleans only). */
export async function checkSignupAvailability(email, phone) {
  if (!isConfigured) return { emailTaken: false, phoneTaken: false };
  await ensureReady();
  const users = await listRows('users');
  const cleanPhone = (phone || '').trim();
  return {
    emailTaken: Boolean(cleanEmail(email) && users.some((u) => sameEmail(u.email, email))),
    phoneTaken: Boolean(cleanPhone && users.some((u) => String(u.phone || '') === cleanPhone)),
  };
}

export async function register({ name, email, phone, password }) {
  if (!isConfigured) {
    return {
      pending: true,
      message: 'Registration received. Your account is pending admin approval.',
      user: { ...demoUser, name, email, phone, role: 'client', status: 'Pending' },
    };
  }

  await ensureReady();
  const { emailTaken, phoneTaken } = await checkSignupAvailability(email, phone);
  if (emailTaken) throw new Error('An account already exists with this email.');
  if (phoneTaken) throw new Error('An account already exists with this phone number.');

  const salt = newId();
  const row = {
    id: newId(),
    name: (name || '').trim(),
    email: cleanEmail(email),
    phone: (phone || '').trim() || null,
    country: null,
    role: 'client',
    status: 'Active',
    title: null,
    department: null,
    timezone: null,
    avatar: null,
    preferences: {},
    password_hash: await sha256(salt + String(password || '')),
    salt,
    created_at: new Date().toISOString(),
  };
  await upsertRows('users', [row]);

  // Create the user's Drive home right away: "<Name> — <email>" folder with
  // all five tool spreadsheets. Failure here is non-fatal — anything missing
  // is lazily re-created on the user's first write.
  try {
    await provisionUserDrive({ id: row.id, name: row.name, email: row.email });
  } catch {
    /* lazily created later */
  }

  // No auto-login, no email confirmation — straight back to the login page.
  return { token: null, user: mapProfile(row), pending: true, needsEmailConfirmation: false };
}

/** Signup email confirmation doesn't exist in the demo — kept as no-ops so
 *  Register.jsx compiles unchanged (it never reaches the code step). */
export async function verifySignupCode() {
  return { ok: true };
}
export async function resendSignupCode() {
  return { ok: true };
}

// ── Password reset / email change — need an email server; stubbed ───────────
export async function requestPasswordResetCode(email) {
  if (!isConfigured) return { exists: true, message: 'A reset code has been sent (demo).' };
  void email;
  throw new Error(NO_SERVER_MSG);
}
export async function verifyPasswordResetCode() {
  if (!isConfigured) return { ok: true };
  throw new Error(NO_SERVER_MSG);
}
export async function updatePassword() {
  if (!isConfigured) return { message: 'Password updated.' };
  throw new Error(NO_SERVER_MSG);
}
export function hasRecoverySession() {
  return false;
}
export function clearRecoverySession() {}

export async function requestEmailChange() {
  if (!isConfigured) return { ok: true };
  throw new Error(NO_SERVER_MSG);
}
export async function verifyEmailChange() {
  if (!isConfigured) return { ok: true };
  throw new Error(NO_SERVER_MSG);
}

export async function getCurrentUser() {
  if (!isConfigured) return demoUser;
  const session = getSession();
  if (!session?.token) return null;
  // interactive:false — this runs at app boot with no user gesture, so it must
  // never open the Google popup; a missing token just keeps the cached profile
  // (gsApi throws GOOGLE_TOKEN, which AuthContext treats as a soft failure).
  const users = await listRows('users', { interactive: false });
  const row = users.find((u) => u.id === session.user?.id) || null;
  if (!row) return null; // account deleted from the sheet → AuthContext signs out
  const profile = mapProfile(row);
  patchSessionUser(profile);
  return profile;
}

export async function logout() {
  if (!isConfigured) return;
  clearSession();
}
