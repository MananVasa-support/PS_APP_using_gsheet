import { supabase, unwrapError, isConfigured } from '@/lib/supabase';

/**
 * Meeting Success Maximizer — data layer.
 *
 * Storage model: ONE row per meeting in `meetings`
 *   { id uuid, user_id uuid, meeting jsonb, created_at, updated_at }
 * `meeting` holds the full record the tool builds: { answers (q1..q18), title,
 * estTime, createdDate, status, experience, reflection, notes[], archived }.
 * Active vs archived lives INSIDE the jsonb (`archived`), and the app's meeting
 * id IS the row uuid (generated client-side so navigation stays synchronous).
 * RLS scopes rows per user; the user_id index keeps lookups instant.
 *
 * Demo mode (no Supabase env): MeetingContext keeps using its localStorage
 * persistence — these functions simply no-op there.
 */

async function myId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/** All meetings for the signed-in user, newest first (active + archived mixed). */
export async function listMeetings() {
  if (!isConfigured) return null; // demo mode → context uses localStorage
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw unwrapError(error);
  return (data || []).map((row) => ({ ...(row.meeting || {}), id: row.id }));
}

/** Insert or fully overwrite one meeting record (id = row uuid). */
export async function persistMeeting(record, archived) {
  if (!isConfigured || !record?.id) return null;
  const uid = await myId();
  if (!uid) return null;
  const { id, ...content } = record;
  const { error } = await supabase
    .from('meetings')
    .upsert(
      { id, user_id: uid, meeting: { ...content, archived: !!archived }, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) throw unwrapError(error);
  return { ok: true };
}

/** Delete one meeting row. */
export async function deleteMeetingRow(id) {
  if (!isConfigured || !id) return null;
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) throw unwrapError(error);
  return { ok: true };
}
