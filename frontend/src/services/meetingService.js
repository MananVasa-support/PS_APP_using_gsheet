/**
 * Meeting Success Maximizer — data layer.
 *
 * Google Sheets storage was removed. MeetingContext persists everything to
 * browser localStorage itself, so these functions are now inert (the context
 * is the single source of truth in local mode). Surface kept so the context is
 * unchanged.
 */

/** Local mode → the context loads from localStorage; nothing to fetch here. */
export async function listMeetings() {
  return null;
}

/** No-op: MeetingContext mirrors both collections to localStorage. */
export async function persistMeeting() {
  return null;
}

/** No-op in local mode. */
export async function deleteMeetingRow() {
  return null;
}
