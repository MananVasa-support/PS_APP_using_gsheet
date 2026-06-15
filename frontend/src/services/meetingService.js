import { listRows, upsertRows, deleteRows, getToken, isConfigured } from '@/lib/gsApi';

/**
 * Meeting Success Maximizer — data layer.
 *
 * Storage (direct Google Sheets): ONE row per meeting in the user's "Meeting"
 * spreadsheet, `meetings` tab:
 *   id | meeting (JSON) | created_at | updated_at
 * `meeting` holds the full record the tool builds: { answers (q1..q18), title,
 * estTime, createdDate, status, experience, reflection, notes[], archived }.
 * Active vs archived lives INSIDE the json (`archived`), and the app's meeting
 * id IS the row id (generated client-side so navigation stays synchronous).
 *
 * Demo mode (no Google client id): MeetingContext keeps using its localStorage
 * persistence — these functions simply no-op there.
 */

/** All meetings for the signed-in user, newest first (active + archived mixed). */
export async function listMeetings() {
  if (!isConfigured) return null; // demo mode → context uses localStorage
  const rows = await listRows('meetings');
  return rows
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((row) => ({ ...(row.meeting || {}), id: row.id }));
}

/** Insert or fully overwrite one meeting record (id = row id). */
export async function persistMeeting(record, archived) {
  if (!isConfigured || !record?.id) return null;
  if (!getToken()) return null;
  const { id, ...content } = record;
  // created_at fills on first insert and is left alone on merge.
  await upsertRows('meetings', [
    { id, meeting: { ...content, archived: !!archived }, updated_at: new Date().toISOString() },
  ]);
  return { ok: true };
}

/** Delete one meeting row. */
export async function deleteMeetingRow(id) {
  if (!isConfigured || !id) return null;
  await deleteRows('meetings', [id]);
  return { ok: true };
}
