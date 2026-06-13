import { isSupabaseConfigured, appGetUser, appUpdateProfile } from '@/lib/supabaseAuth';
import { getSession, patchSessionUser } from '@/lib/gsApi';
import { mapProfile } from '@/utils/mappers';
import { demoUser } from '@/data/mockData';

/** Current-user profile + preferences (Supabase `app_users` table). */

function myId() {
  const id = getSession()?.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

export async function getProfile() {
  if (!isSupabaseConfigured) return demoUser;
  const row = await appGetUser(myId());
  return mapProfile(row);
}

/** Update the user's own profile. Sensitive fields (role/status) are simply
 *  not accepted by the app_update_profile RPC, mirroring the old DB trigger. */
export async function updateProfile(payload = {}) {
  if (!isSupabaseConfigured) return { ...demoUser, ...payload };
  const id = myId();

  const ALLOWED = ['name', 'title', 'department', 'phone', 'country', 'timezone', 'avatar'];
  const patch = {};
  for (const key of ALLOWED) {
    if (payload[key] !== undefined) patch[key] = payload[key];
  }
  if (Object.keys(patch).length === 0) return getProfile();

  const profile = mapProfile(await appUpdateProfile(id, patch));
  patchSessionUser(profile); // keep the cached session user fresh
  return profile;
}

export async function updatePreferences(prefs) {
  if (!isSupabaseConfigured) return prefs;
  const updated = await appUpdateProfile(myId(), { preferences: prefs });
  return updated?.preferences || prefs;
}

/** File storage doesn't exist in this demo — avatars are URL-only. */
export async function uploadAvatar() {
  if (!isSupabaseConfigured) return { path: '', url: '' };
  throw new Error('Avatar upload is not available in this demo.');
}
