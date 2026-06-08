// Date helpers for the date-anchored weekly planner.
//
// Model: the user picks ONE start date (the first day of their Week 1). Every
// week is exactly 7 days, rolling +7 from that start date forever. A week is
// identified everywhere by the ISO date ("YYYY-MM-DD") of its FIRST day, so the
// key is absolute and human-meaningful (e.g. "2026-06-01"). Weeks that straddle
// a month boundary (e.g. 29 Jun – 5 Jul) fall out naturally — no special case.
//
// All math is done in UTC-midnight milliseconds so it never drifts across
// daylight-saving changes; the ISO strings themselves carry no timezone.

const MS_PER_DAY = 86400000;

// "YYYY-MM-DD" -> UTC milliseconds at midnight (null on bad input).
const isoToUtcMs = (iso) => {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
};

// UTC milliseconds -> "YYYY-MM-DD".
const utcMsToIso = (ms) => {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Today's local date as an ISO string (uses the user's local calendar day).
export const todayISO = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const isValidISO = (iso) => isoToUtcMs(iso) !== null;

// Clamp an ISO date so it's never before today (used on target-date pickers).
export const clampNotPast = (iso) => (iso && iso < todayISO() ? todayISO() : iso);

// Clamp an ISO date into [minISO, maxISO] (either bound optional). ISO strings
// compare correctly as plain strings.
export const clampToRange = (iso, minISO, maxISO) => {
  if (!iso) return iso;
  let v = iso;
  if (minISO && v < minISO) v = minISO;
  if (maxISO && v > maxISO) v = maxISO;
  return v;
};

// Add n days to an ISO date, returning a new ISO date.
export const addDaysISO = (iso, n) => {
  const ms = isoToUtcMs(iso);
  if (ms === null) return iso;
  return utcMsToIso(ms + n * MS_PER_DAY);
};

// Whole-day difference (b - a). Positive when b is after a.
export const daysBetweenISO = (aISO, bISO) => {
  const a = isoToUtcMs(aISO);
  const b = isoToUtcMs(bISO);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / MS_PER_DAY);
};

// Whole-week difference (b - a) measured in 7-day blocks from the anchor.
export const weeksBetweenISO = (aISO, bISO) =>
  Math.floor(daysBetweenISO(aISO, bISO) / 7);

// Start ISO of the 7-day block (anchored on `startISO`) that contains `dateISO`.
// If `dateISO` is before the anchor, this returns the anchor itself (we never
// produce weeks earlier than the user's chosen start).
export const weekStartFor = (dateISO, startISO) => {
  const blocks = weeksBetweenISO(startISO, dateISO);
  if (blocks <= 0) return startISO;
  return addDaysISO(startISO, blocks * 7);
};

// The last (7th) day of the week beginning on `weekStartISO`.
export const weekEndISO = (weekStartISO) => addDaysISO(weekStartISO, 6);

const parseLocal = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// "1 – 7 June"  /  "29 Jun – 5 Jul"  (cross-month uses short month names).
// `weekEndArgISO` lets callers pass a variable week end; defaults to start + 6.
export const formatWeekRange = (weekStartISO, weekEndArgISO) => {
  if (!isValidISO(weekStartISO)) return "";
  const start = parseLocal(weekStartISO);
  const end = parseLocal(weekEndArgISO || weekEndISO(weekStartISO));
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const month = start.toLocaleString(undefined, { month: "long" });
    return `${start.getDate()} – ${end.getDate()} ${month}`;
  }
  const sM = start.toLocaleString(undefined, { month: "short" });
  const eM = end.toLocaleString(undefined, { month: "short" });
  return `${start.getDate()} ${sM} – ${end.getDate()} ${eM}`;
};

// Month label for the left side of the navigator. Shows both months when the
// week spans a boundary: "June 2026" or "Jun – Jul 2026".
export const formatMonthLabel = (weekStartISO, weekEndArgISO) => {
  if (!isValidISO(weekStartISO)) return "";
  const start = parseLocal(weekStartISO);
  const end = parseLocal(weekEndArgISO || weekEndISO(weekStartISO));
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return start.toLocaleString(undefined, { month: "long", year: "numeric" });
  }
  const sM = start.toLocaleString(undefined, { month: "short" });
  const eM = end.toLocaleString(undefined, { month: "short" });
  if (start.getFullYear() === end.getFullYear()) {
    return `${sM} – ${eM} ${end.getFullYear()}`;
  }
  return `${sM} ${start.getFullYear()} – ${eM} ${end.getFullYear()}`;
};

// Friendly one-line label for pickers/history: "Week of 1 – 7 June".
export const formatWeekTitle = (weekStartISO, weekEndArgISO) =>
  `Week of ${formatWeekRange(weekStartISO, weekEndArgISO)}`;

// Range with weekday names, showing the month on BOTH dates so the month is
// never ambiguous: "Mon 1 Jun – Sun 7 Jun" / "Sun 29 Jun – Sat 5 Jul".
export const formatWeekRangeDays = (weekStartISO, weekEndArgISO) => {
  if (!isValidISO(weekStartISO)) return "";
  const start = parseLocal(weekStartISO);
  const end = parseLocal(weekEndArgISO || weekEndISO(weekStartISO));
  const sd = start.toLocaleString(undefined, { weekday: "short" });
  const ed = end.toLocaleString(undefined, { weekday: "short" });
  const sM = start.toLocaleString(undefined, { month: "short" });
  const eM = end.toLocaleString(undefined, { month: "short" });
  return `${sd} ${start.getDate()} ${sM} – ${ed} ${end.getDate()} ${eM}`;
};

// 0 = Sunday … 6 = Saturday for an ISO date.
export const weekdayOf = (iso) => {
  if (!isValidISO(iso)) return 0;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

// The Monday on or after `fromISO` (today by default).
export const nextMondayISO = (fromISO = todayISO()) => {
  const dow = weekdayOf(fromISO); // Sun=0 … Sat=6
  const delta = (8 - dow) % 7; // Mon -> 0, Sun -> 1, Tue -> 6 …
  return addDaysISO(fromISO, delta);
};

// "Monday, 8 June" — used to preview when a Mon–Sun plan would begin.
export const formatLongDate = (iso) => {
  if (!isValidISO(iso)) return "";
  return parseLocal(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};
