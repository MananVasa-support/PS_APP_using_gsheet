// Google Calendar API — front-end-only OAuth (no backend). Lets the app sign the
// user in with Google and push events straight into their calendar (with colour),
// so you can SEE the real import. This is the demo/dev approach: the access token
// lives in the browser and lasts ~1 hour, so the user re-connects each session.
// The production version stores a refresh token server-side (later, with backend).
//
// SETUP (one-time): create an OAuth Client ID (Web app) in Google Cloud, add your
// dev origin to "Authorized JavaScript origins", then put the id in a .env file:
//   VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
// (or paste it into GOOGLE_CLIENT_ID below) and restart `npm run dev`.

import { addDaysISO } from "./weekDates";
import { addDurationToStartTime } from "./powerPlannerUtils";
import { browserTimeZone } from "./googleCalendar";

const GOOGLE_CLIENT_ID =
  import.meta.env?.VITE_GOOGLE_CLIENT_ID ||
  "" /* ← or paste your Client ID here */;

const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export const isGoogleConfigured = () => !!GOOGLE_CLIENT_ID;

// Load Google Identity Services once.
let gisPromise = null;
const loadGis = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in."));
    document.head.appendChild(s);
  });
  return gisPromise;
};

// Pop the Google consent/sign-in and resolve with a short-lived access token.
export const requestCalendarToken = async () => {
  if (!GOOGLE_CLIENT_ID) throw new Error("Google Client ID not set.");
  await loadGis();
  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (resp) => {
          if (resp && resp.access_token) resolve(resp.access_token);
          else reject(new Error("No access token returned."));
        },
        error_callback: (err) =>
          reject(new Error(err?.message || "Sign-in was cancelled.")),
      });
      client.requestAccessToken();
    } catch (e) {
      reject(e);
    }
  });
};

// Turn one of our built events into a Calendar API event body.
const eventToApiBody = (ev, tz) => {
  const body = { summary: ev.title };
  if (ev.details) body.description = ev.details;
  if (ev.colorId) body.colorId = ev.colorId;
  if (ev.rrule) body.recurrence = [ev.rrule];
  if (ev.date && ev.start) {
    const end = ev.end || addDurationToStartTime(ev.start, ev.duration) || ev.start;
    body.start = { dateTime: `${ev.date}T${ev.start}:00`, timeZone: tz };
    body.end = { dateTime: `${ev.date}T${end}:00`, timeZone: tz };
  } else if (ev.date) {
    // All-day single day.
    body.start = { date: ev.date };
    body.end = { date: addDaysISO(ev.date, 1) };
  }
  return body;
};

// Remembers which Google event each planner task created, so re-exporting
// UPDATES the same event instead of adding a duplicate. Keyed by the task id;
// stored per-browser (moves to the backend later). Identity-based — changing a
// task's name / category / time still updates its one event.
const EVENT_ID_KEY = "power-planner-gcal-event-ids";
export const loadEventIdMap = () => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(EVENT_ID_KEY) || "{}") || {};
  } catch {
    return {};
  }
};
const saveEventIdMap = (map) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EVENT_ID_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// Create or update each event in the user's primary calendar. An event that
// already has a stored Google id is UPDATED (PUT) so the user's manual tweaks
// in Calendar (like recolouring) are replaced by the latest plan; if that event
// was deleted in Calendar, we recreate it.
//
// `opts.keepRowIds` (when provided) is the FULL set of planner row ids that
// should currently have a calendar event — computed across EVERY week, not just
// the ones being pushed now. Any previously-exported event whose row id is NOT
// in that set is now stale (the task was delegated away from Self, lost its
// date, was deleted, or turned into a repeat copy) and gets REMOVED from the
// calendar. Passing the global set is what keeps other weeks' events safe: they
// stay in `keepRowIds`, so only genuinely-orphaned events are deleted.
//
// Returns counts (created, updated, removed) + the list of failures.
export const pushEventsToCalendar = async (
  events,
  token,
  tz = browserTimeZone(),
  opts = {}
) => {
  const idMap = loadEventIdMap();
  let created = 0;
  let updated = 0;
  let removed = 0;
  const failed = [];
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  for (const ev of events) {
    const body = JSON.stringify(eventToApiBody(ev, tz));
    const existingId = idMap[ev.rowId];
    try {
      let res;
      let wasUpdate = false;
      if (existingId) {
        res = await fetch(`${EVENTS_URL}/${existingId}`, {
          method: "PUT",
          headers,
          body,
        });
        if (res.status === 404 || res.status === 410) {
          // The event was deleted in Calendar — recreate it.
          res = await fetch(EVENTS_URL, { method: "POST", headers, body });
        } else {
          wasUpdate = true;
        }
      } else {
        res = await fetch(EVENTS_URL, { method: "POST", headers, body });
      }
      if (res.ok) {
        const data = await res.json();
        idMap[ev.rowId] = data.id;
        if (wasUpdate) updated += 1;
        else created += 1;
      } else {
        failed.push(ev.title);
      }
    } catch {
      failed.push(ev.title);
    }
  }
  // Prune stale events: anything we exported before whose row should no longer
  // be on the calendar. Only runs when the caller passes the global keep-set, so
  // older callers (and the link fallback) are unaffected.
  if (Array.isArray(opts.keepRowIds)) {
    const keep = new Set(opts.keepRowIds);
    for (const rowId of Object.keys(idMap)) {
      if (keep.has(rowId)) continue;
      const eventId = idMap[rowId];
      try {
        const res = await fetch(`${EVENTS_URL}/${eventId}`, {
          method: "DELETE",
          headers,
        });
        // 200/204 = deleted; 404/410 = already gone in Calendar. Either way the
        // mapping is obsolete, so drop it. Other errors: keep the mapping so a
        // later export can retry the delete.
        if (res.ok || res.status === 404 || res.status === 410) {
          delete idMap[rowId];
          removed += 1;
        } else {
          failed.push(rowId);
        }
      } catch {
        // Network error — leave the mapping for a future retry.
      }
    }
  }
  saveEventIdMap(idMap);
  return { created, updated, removed, failed };
};
