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
import { isConfigured } from "@/lib/supabase";
import { loadGcalEventIds, saveGcalEventIds } from "@/services/ppService";

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

// ── "Sign in once" server tokens — NOT AVAILABLE on the Sheets backend ──────
// The Supabase Edge Function `gcal` (server-held refresh tokens) does not
// exist on the gsheets-backend branch, so the silent sign-in-once path is
// stubbed off and every flow below falls through to the classic GIS popup
// (frontend-only OAuth; the user re-connects roughly once an hour).
const SERVER_GCAL = false;
const FN_BASE = "";

const fnAuthHeader = async () => null;

// Silent token from the stored refresh token. null = not connected / no function.
const serverToken = async () => {
  if (!SERVER_GCAL) return null;
  try {
    const headers = await fnAuthHeader();
    if (!headers) return null;
    const res = await fetch(`${FN_BASE}/token`, { method: "POST", headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
};

// One-time connect: opens the Google consent window. After Allow, that window
// lands directly on Google Calendar (nice for the user); the app detects the
// completed connection by POLLING /token until it succeeds (or the window is
// closed / ~2 minutes pass).
const connectViaServer = async () => {
  if (!SERVER_GCAL) throw new Error("__fn_unavailable__");
  const headers = await fnAuthHeader();
  if (!headers) throw new Error("Not signed in.");
  const res = await fetch(`${FN_BASE}/authorize`, { method: "POST", headers });
  if (!res.ok) throw new Error("__fn_unavailable__");
  const { url } = await res.json();
  const win = window.open(url, "gcal-connect", "width=560,height=720");
  if (!win) {
    throw new Error("Popup blocked — allow popups to connect Google Calendar.");
  }
  const started = Date.now();
  // Poll until the refresh token is stored server-side.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((r) => setTimeout(r, 1500));
    const token = await serverToken();
    if (token) return token; // connected — leave the Calendar tab open for the user
    if (win.closed) return null; // user closed it — requestCalendarToken retries once anyway
    if (Date.now() - started > 120000) return null; // give up after 2 min
  }
};

/** Forget the Google connection (lets the user switch accounts). */
export const disconnectGoogleCalendar = async () => {
  if (!SERVER_GCAL) return { ok: false }; // popup tokens aren't stored anywhere
  const headers = await fnAuthHeader();
  if (!headers) return { ok: false };
  try {
    const res = await fetch(`${FN_BASE}/disconnect`, { method: "POST", headers });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
};

// Get a Calendar access token. Order: silent server token → one-time server
// connect (single consent, then silent forever) → classic GIS popup fallback.
// On the Sheets backend SERVER_GCAL is false, so this goes straight to the popup.
export const requestCalendarToken = async () => {
  if (isConfigured && SERVER_GCAL) {
    let token = await serverToken();
    if (token) return token;
    try {
      token = await connectViaServer();
      if (token) return token;
      token = await serverToken();
      if (token) return token;
    } catch (e) {
      if (e?.message && e.message !== "__fn_unavailable__" && !/unavailable/i.test(e.message)) {
        // Real user-facing problem (e.g. popup blocked) — surface it.
        if (/popup/i.test(e.message)) throw e;
      }
      // Function not deployed yet → fall through to the GIS popup.
    }
  }
  return requestCalendarTokenViaPopup();
};

// Classic popup flow (Google Identity Services) — fallback / demo mode.
const requestCalendarTokenViaPopup = async () => {
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
// UPDATES the same event instead of adding a duplicate. Keyed by the task id.
// With Supabase connected the map lives in power_planner_settings
// (gcal_event_ids) — per-user and cross-device, so exporting from a second
// device updates the SAME events instead of duplicating them. Demo mode keeps
// the original per-browser localStorage. Identity-based — changing a task's
// name / category / time still updates its one event.
const EVENT_ID_KEY = "power-planner-gcal-event-ids";
let memMap = null; // configured-mode cache (hydrated from the DB)

/** Pull the latest map from the user's account (call before an export). */
export const hydrateEventIdMap = async () => {
  if (!isConfigured) return loadEventIdMap();
  try {
    memMap = (await loadGcalEventIds()) || {};
  } catch {
    memMap = memMap || {};
  }
  return memMap;
};

export const loadEventIdMap = () => {
  if (isConfigured) return memMap || {};
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(EVENT_ID_KEY) || "{}") || {};
  } catch {
    return {};
  }
};
const saveEventIdMap = (map) => {
  if (isConfigured) {
    memMap = map;
    saveGcalEventIds(map); // debounced upsert into power_planner_settings
    return;
  }
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
  const idMap = { ...(await hydrateEventIdMap()) };
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
