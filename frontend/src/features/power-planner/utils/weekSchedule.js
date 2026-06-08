// Variable-length week schedule.
//
// The planner used to assume every week is exactly 7 days, rolling +7 from one
// start date. Now Week 1 can be a custom length and any later week can be
// resized too — while 7-day Mon–Sun stays the recommended default.
//
// A SCHEDULE is an ascending list of week-START ISO dates, contiguous with no
// gaps: schedule[0] is Week 1's custom start, and week i spans
// [schedule[i], schedule[i+1] - 1 day]. Past the last stored boundary, weeks
// simply roll +7 (the recommended default), so the stored list stays short and
// — crucially — a schedule of just [startDate] reproduces the old fixed grid
// exactly, keeping every previously-saved week valid.

import { addDaysISO, daysBetweenISO, isValidISO, weekdayOf } from "./weekDates";

export const isValidSchedule = (s) =>
  Array.isArray(s) && s.length > 0 && s.every((d) => isValidISO(d));

// A plain default schedule (pure 7-day grid) anchored on one start date.
export const scheduleFromStart = (startISO) =>
  isValidISO(startISO) ? [startISO] : [];

// Roll +7 from the last boundary until there is a boundary strictly greater
// than `dateISO`, so the date is guaranteed to sit inside a known week. Returns
// a NEW array; never mutates the input.
const extendPast = (schedule, dateISO) => {
  const out = [...schedule];
  while (out[out.length - 1] <= dateISO) {
    out.push(addDaysISO(out[out.length - 1], 7));
  }
  return out;
};

// Start date of the week that contains `dateISO`. Dates before Week 1 clamp to
// Week 1's start (we never produce weeks earlier than the chosen start).
export const weekStartForDate = (schedule, dateISO) => {
  if (!isValidSchedule(schedule) || !isValidISO(dateISO)) {
    return (schedule && schedule[0]) || "";
  }
  if (dateISO < schedule[0]) return schedule[0];
  const ext = extendPast(schedule, dateISO);
  let result = ext[0];
  for (let i = 0; i < ext.length; i += 1) {
    if (ext[i] <= dateISO) result = ext[i];
    else break;
  }
  return result;
};

// Start of the week AFTER the one beginning at `weekStartISO`.
export const nextWeekStart = (schedule, weekStartISO) => {
  if (!isValidSchedule(schedule) || !isValidISO(weekStartISO)) {
    return addDaysISO(weekStartISO, 7);
  }
  const ext = extendPast(schedule, weekStartISO);
  for (let i = 0; i < ext.length; i += 1) {
    if (ext[i] > weekStartISO) return ext[i];
  }
  return addDaysISO(ext[ext.length - 1], 7);
};

// Start of the week BEFORE `weekStartISO`, or null if it's the very first week.
export const prevWeekStart = (schedule, weekStartISO) => {
  if (!isValidSchedule(schedule) || !isValidISO(weekStartISO)) return null;
  if (weekStartISO <= schedule[0]) return null;
  const ext = extendPast(schedule, weekStartISO);
  let prev = null;
  for (let i = 0; i < ext.length; i += 1) {
    if (ext[i] < weekStartISO) prev = ext[i];
    else break;
  }
  return prev;
};

// Last (inclusive) day of the week beginning at `weekStartISO`.
export const weekEndForStart = (schedule, weekStartISO) =>
  addDaysISO(nextWeekStart(schedule, weekStartISO), -1);

// Number of days in that week (7 by default).
export const weekLengthDays = (schedule, weekStartISO) =>
  daysBetweenISO(weekStartISO, nextWeekStart(schedule, weekStartISO));

// Recommended END for a week starting on `startISO`: the first Sunday on/after
// the start, so weeks line up Mon–Sun. (A Sunday start recommends a full 7-day
// week ending the following Saturday.)
export const recommendedEndFor = (startISO) => {
  if (!isValidISO(startISO)) return startISO;
  const dow = weekdayOf(startISO); // 0 Sun … 6 Sat
  const delta = dow === 0 ? 6 : 7 - dow;
  return addDaysISO(startISO, delta);
};

// True when this week already matches the recommended 7-day Mon–Sun shape.
export const isRecommendedWeek = (schedule, weekStartISO) =>
  weekEndForStart(schedule, weekStartISO) === recommendedEndFor(weekStartISO);

// Set the END date of the week beginning at `weekStartISO`. Returns a NEW
// schedule that keeps every boundary up to & including this week's start, sets
// the next boundary to end+1, and DROPS any later explicit boundaries so the
// weeks after this one fall back to the rolling +7 default. Past weeks are not
// the caller's concern here — the UI only offers this for current/future weeks.
export const setWeekEnd = (schedule, weekStartISO, endISO) => {
  if (!isValidSchedule(schedule) || !isValidISO(endISO)) return schedule;
  const nextStart = addDaysISO(endISO, 1);
  if (nextStart <= weekStartISO) return schedule; // end must be on/after start
  const head = schedule.filter((s) => s <= weekStartISO);
  if (head[head.length - 1] !== weekStartISO) head.push(weekStartISO);
  return [...head, nextStart];
};

// Walk both schedules in lockstep from the boundary AFTER `fromStartISO`,
// pairing the old week-start key with where that same ordinal week now lands.
// Used to re-key saved future-week data when a week is resized. Stops once both
// boundaries pass `untilISO`.
export const remapFutureStarts = (oldSchedule, newSchedule, fromStartISO, untilISO) => {
  const remap = {};
  let oldS = nextWeekStart(oldSchedule, fromStartISO);
  let newS = nextWeekStart(newSchedule, fromStartISO);
  let guard = 0;
  while (oldS <= untilISO && guard < 520) {
    if (oldS !== newS) remap[oldS] = newS;
    oldS = nextWeekStart(oldSchedule, oldS);
    newS = nextWeekStart(newSchedule, newS);
    guard += 1;
  }
  return remap;
};
