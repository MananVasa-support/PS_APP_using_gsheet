// Build Google Calendar "create event" links from planner tasks.
//
// We use Google Calendar's public TEMPLATE render URL, which opens its
// create-event page pre-filled — no API keys or OAuth needed. Each sub-action
// (or Other Things item) becomes one event; a recurring task carries an RRULE so
// Google creates it as a recurring event (we therefore export only the master
// rows, never the generated weekly copies, to avoid duplicates).

import { isRecurring, toRRULE, describeRecurrence } from "./recurrence";
import { addDurationToStartTime } from "./powerPlannerUtils";
import { addDaysISO } from "./weekDates";
import { colorByKey } from "../data/colorCoding";

const resolveTag = (val, custom) => (val === "Other" ? custom : val) || "";

const compactDate = (iso) => (iso ? iso.replace(/-/g, "") : "");
const compactDateTime = (iso, hhmm) =>
  `${compactDate(iso)}T${(hhmm || "").replace(":", "")}00`;

// The browser's IANA timezone (e.g. "Asia/Kolkata"), so the event lands at the
// right wall-clock time regardless of where Google thinks the user is.
export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

// Build a normalized event from a sub-action (`row` with parentCommitmentId) or
// an Other Things item (`row`, `parent` = null). Title = "Category : Purpose :
// Name" with empty parts dropped.
export const buildCalendarEvent = (row, parent) => {
  const isSub = row.parentCommitmentId !== undefined;
  const name = (isSub ? row.description : row.result) || "(untitled)";
  const category = isSub
    ? row.category
      ? resolveTag(row.category, row.customCategory)
      : resolveTag(parent?.category, parent?.customCategory)
    : resolveTag(row.category, row.customCategory);
  // Purpose cascades like Category: an action that hasn't picked its own Purpose
  // inherits the goal's (which is what the UI shows it defaulting to), so the
  // calendar title keeps the "Category : Purpose : Name" shape instead of "C :: N".
  const purpose = isSub
    ? row.purpose
      ? resolveTag(row.purpose, row.customPurpose)
      : resolveTag(parent?.purpose, parent?.customPurpose)
    : resolveTag(row.purpose, row.customPurpose);
  const title = [category, purpose, name]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" : ");

  const date = (row.executionDate || row.targetDate || "").trim();
  const start = (row.startTime || "").trim();
  let end = (row.endTime || "").trim();
  if (start && !end) end = addDurationToStartTime(start, row.duration) || start;

  // Recurrence: a sub-action that rides along with its goal inherits the goal's
  // schedule; otherwise use the row's own schedule.
  let rrule = "";
  let repeatLabel = "";
  const ridesWithGoal =
    isSub &&
    parent &&
    isRecurring(parent.frequency) &&
    (parent.recurSubIds || []).includes(row.id);
  if (ridesWithGoal) {
    rrule = toRRULE(
      parent.frequency,
      parent.recurEnd,
      parent.recurCustom,
      parent.recurDays
    );
    repeatLabel = describeRecurrence(
      parent.frequency,
      parent.recurEnd,
      parent.recurCustom,
      parent.recurDays,
      parent.targetDate
    );
  } else if (isRecurring(row.frequency)) {
    rrule = toRRULE(row.frequency, row.recurEnd, row.recurCustom, row.recurDays);
    repeatLabel = describeRecurrence(
      row.frequency,
      row.recurEnd,
      row.recurCustom,
      row.recurDays,
      date
    );
  }

  return {
    id: row.id,
    rowId: row.id, // planner task id — links to its created Google event
    title: title || name,
    name,
    category,
    purpose,
    date,
    start,
    end,
    duration: row.duration || "",
    rrule,
    repeatLabel,
    details: "", // no description written to the calendar event
    // Colour-coding → Google Calendar `colorId` (used by the future API push;
    // the create-event link can't carry colour).
    colorKey: row.colorKey || "",
    colorId: colorByKey(row.colorKey)?.googleColorId || "",
    colorLabel: colorByKey(row.colorKey)?.label || "",
    kind: isSub ? "sub-action" : "other thing",
  };
};

// The prefilled Google Calendar create-event URL for one event.
export const toGoogleCalendarUrl = (ev, tz = browserTimeZone()) => {
  const params = [`action=TEMPLATE`, `text=${encodeURIComponent(ev.title)}`];

  let dates = "";
  if (ev.date && ev.start) {
    const end =
      ev.end || addDurationToStartTime(ev.start, ev.duration) || ev.start;
    dates = `${compactDateTime(ev.date, ev.start)}/${compactDateTime(ev.date, end)}`;
  } else if (ev.date) {
    // No start time → an all-day event spanning that single day.
    dates = `${compactDate(ev.date)}/${compactDate(addDaysISO(ev.date, 1))}`;
  }
  if (dates) params.push(`dates=${dates}`);
  if (ev.rrule) params.push(`recur=${encodeURIComponent(ev.rrule)}`);
  if (ev.details) params.push(`details=${encodeURIComponent(ev.details)}`);
  // ctz only matters for timed events.
  if (tz && ev.start) params.push(`ctz=${encodeURIComponent(tz)}`);

  return `https://calendar.google.com/calendar/render?${params.join("&")}`;
};
