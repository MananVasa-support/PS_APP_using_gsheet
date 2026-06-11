// Schedule a meeting into the user's Google Calendar. Reuses the same Google
// OAuth engine as Power Planner (one Client ID for the whole app), but each
// meeting remembers ITS OWN calendar event id (meeting.gcalEventId in the
// record → persisted to Supabase by MeetingContext), so re-scheduling UPDATES
// the same event instead of duplicating — and Power Planner's export/cleanup
// can never touch meeting events.

import {
  requestCalendarToken,
  isGoogleConfigured,
} from '@/features/power-planner/utils/googleCalendarApi';
import { browserTimeZone } from '@/features/power-planner/utils/googleCalendar';

export { isGoogleConfigured };

// "01/30" (HH/MM) → minutes. Falls back to 30.
export const durationToMinutes = (str) => {
  const [h, m] = String(str || '').split('/').map((n) => parseInt(n, 10) || 0);
  const total = h * 60 + m;
  return total > 0 ? total : 30;
};

const pad = (n) => String(n).padStart(2, '0');

/**
 * Create/update the Google Calendar event for a meeting.
 * @param meeting   the meeting record (answers, title, gcalEventId?)
 * @param dateISO   'YYYY-MM-DD'
 * @param startHHMM 'HH:MM' (24h)
 * @returns {Promise<{eventId: string}>}
 */
export async function scheduleMeetingOnCalendar(meeting, dateISO, startHHMM) {
  const token = await requestCalendarToken();
  const tz = browserTimeZone();

  // Duration: the final estimate (q17) wins over the initial one (q3).
  const minutes = durationToMinutes(meeting.answers?.q17 || meeting.answers?.q3);
  const [h, m] = startHHMM.split(':').map((n) => parseInt(n, 10) || 0);
  const endTotal = h * 60 + m + minutes;
  const end = `${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}`;
  // A meeting that crosses midnight ends on the NEXT day.
  let endDateISO = dateISO;
  if (endTotal >= 24 * 60) {
    const d = new Date(`${dateISO}T00:00:00`);
    d.setDate(d.getDate() + 1);
    endDateISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  const details = [
    meeting.answers?.q2 && `What: ${meeting.answers.q2}`,
    meeting.answers?.q4 && `Purpose: ${meeting.answers.q4}`,
    meeting.answers?.q6 && `Attendees: ${meeting.answers.q6}`,
  ]
    .filter(Boolean)
    .join('\n');

  const body = JSON.stringify({
    summary: `Meeting: ${meeting.title || 'Untitled Meeting'}`,
    ...(details ? { description: details } : {}),
    start: { dateTime: `${dateISO}T${startHHMM}:00`, timeZone: tz },
    end: { dateTime: `${endDateISO}T${end}:00`, timeZone: tz },
  });

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

  let res;
  if (meeting.gcalEventId) {
    res = await fetch(`${BASE}/${meeting.gcalEventId}`, { method: 'PUT', headers, body });
    // Event deleted in Calendar → recreate it.
    if (res.status === 404 || res.status === 410) {
      res = await fetch(BASE, { method: 'POST', headers, body });
    }
  } else {
    res = await fetch(BASE, { method: 'POST', headers, body });
  }
  if (!res.ok) throw new Error('Could not add the meeting to Google Calendar.');
  const data = await res.json();
  return { eventId: data.id };
}

/** Remove a meeting's calendar event (used when the meeting is deleted). */
export async function removeMeetingFromCalendar(meeting) {
  if (!meeting?.gcalEventId || !isGoogleConfigured()) return { ok: false };
  const token = await requestCalendarToken();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.gcalEventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  // 404/410 = already gone in Calendar — that's fine.
  return { ok: res.ok || res.status === 404 || res.status === 410 };
}
