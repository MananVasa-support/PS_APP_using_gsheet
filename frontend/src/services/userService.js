import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { mapProfile } from '@/utils/mappers';
import { demoUser } from '@/data/mockData';

/** Current-user profile, preferences, and avatar upload. */

async function getMyId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function getProfile() {
  if (!isConfigured) return demoUser;
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw unwrapError(error);
  return mapProfile(data);
}

/** Update the user's own profile. Sensitive fields (role/status/clientId)
 *  are blocked by a DB trigger and silently ignored if passed. */
export async function updateProfile(payload = {}) {
  if (!isConfigured) return { ...demoUser, ...payload };
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');

  const ALLOWED = ['name', 'title', 'department', 'phone', 'country', 'timezone', 'avatar'];
  const row = {};
  for (const key of ALLOWED) {
    if (payload[key] !== undefined) row[key] = payload[key];
  }
  if (Object.keys(row).length === 0) return getProfile();

  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw unwrapError(error);
  return mapProfile(data);
}

export async function updatePreferences(prefs) {
  if (!isConfigured) return prefs;
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('profiles')
    .update({ preferences: prefs })
    .eq('id', id)
    .select('preferences')
    .single();
  if (error) throw unwrapError(error);
  return data?.preferences || prefs;
}

/** Upload an avatar image to the `avatars` bucket and persist its URL on the profile. */
export async function uploadAvatar(file) {
  if (!isConfigured) return { path: '', url: '' };
  const id = await getMyId();
  if (!id) throw new Error('Not authenticated');
  if (!file) throw new Error('No file provided');

  const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
  const path = `${id}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/png' });
  if (upErr) throw unwrapError(upErr);

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = pub.publicUrl;
  const { error: updErr } = await supabase.from('profiles').update({ avatar: url }).eq('id', id);
  if (updErr) throw unwrapError(updErr);
  return { path, url };
}
