import { call, isConfigured, getSession, patchSessionUser } from '@/lib/gsApi';
import { mapProfile } from '@/utils/mappers';
import { demoUser } from '@/data/mockData';

/** Current-user profile + preferences (Google Sheets backend: users sheet). */

export async function getProfile() {
  if (!isConfigured) return demoUser;
  if (!getSession()?.token) throw new Error('Not authenticated');
  const me = await call('/me');
  return mapProfile(me);
}

/** Update the user's own profile. Sensitive fields (role/status) are simply
 *  not accepted by the /updateProfile route, mirroring the old DB trigger. */
export async function updateProfile(payload = {}) {
  if (!isConfigured) return { ...demoUser, ...payload };
  if (!getSession()?.token) throw new Error('Not authenticated');

  const ALLOWED = ['name', 'title', 'department', 'phone', 'country', 'timezone', 'avatar'];
  const patch = {};
  for (const key of ALLOWED) {
    if (payload[key] !== undefined) patch[key] = payload[key];
  }
  if (Object.keys(patch).length === 0) return getProfile();

  const updated = await call('/updateProfile', { patch });
  const profile = mapProfile(updated);
  patchSessionUser(profile); // keep the cached session user fresh
  return profile;
}

export async function updatePreferences(prefs) {
  if (!isConfigured) return prefs;
  if (!getSession()?.token) throw new Error('Not authenticated');
  const updated = await call('/updateProfile', { patch: { preferences: prefs } });
  return updated?.preferences || prefs;
}

/** File storage doesn't exist on the Sheets backend — avatars are URL-only. */
export async function uploadAvatar() {
  if (!isConfigured) return { path: '', url: '' };
  throw new Error('Avatar upload is not available on the Google Sheets backend.');
}
