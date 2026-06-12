import { listRows, upsertRows, isConfigured, getSession, patchSessionUser } from '@/lib/gsApi';
import { mapProfile } from '@/utils/mappers';
import { demoUser } from '@/data/mockData';

/** Current-user profile + preferences (users tab of the _System spreadsheet). */

function myId() {
  const id = getSession()?.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

export async function getProfile() {
  if (!isConfigured) return demoUser;
  const id = myId();
  const users = await listRows('users');
  return mapProfile(users.find((u) => u.id === id) || null);
}

/** Update the user's own profile. Sensitive fields (role/status) are simply
 *  never written here, mirroring the old DB trigger. */
export async function updateProfile(payload = {}) {
  if (!isConfigured) return { ...demoUser, ...payload };
  const id = myId();

  const ALLOWED = ['name', 'title', 'department', 'phone', 'country', 'timezone', 'avatar'];
  const patch = {};
  for (const key of ALLOWED) {
    if (payload[key] !== undefined) patch[key] = payload[key];
  }
  if (Object.keys(patch).length === 0) return getProfile();

  // upsertRows MERGES by id — only the provided columns change.
  const [updated] = await upsertRows('users', [{ id, ...patch }]);
  const profile = mapProfile(updated);
  patchSessionUser(profile); // keep the cached session user fresh
  return profile;
}

export async function updatePreferences(prefs) {
  if (!isConfigured) return prefs;
  const id = myId();
  const [updated] = await upsertRows('users', [{ id, preferences: prefs }]);
  return updated?.preferences || prefs;
}

/** File storage doesn't exist on the Sheets demo — avatars are URL-only. */
export async function uploadAvatar() {
  if (!isConfigured) return { path: '', url: '' };
  throw new Error('Avatar upload is not available in the Google Sheets demo.');
}
