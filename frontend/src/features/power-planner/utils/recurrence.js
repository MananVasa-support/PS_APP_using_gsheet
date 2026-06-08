// Recurrence engine for the planner.
//
// A task that repeats is a "series master" (a Top Goal, or an Other Things
// item). On save we reconcile the whole week-map: for every master we work out
// the dates it should occur on, then make sure a lightweight COPY row exists in
// each target week (carrying only the task text + that date — no time, duration
// or delegate), and remove copies that no longer belong (schedule changed,
// switched back to "once", a date was skipped, or the master was deleted).
//
// Copies are flagged `isRepeat: true` and linked to the master by `seriesId`.
// They are never themselves recurring (frequency stays "once") and the UI shows
// them as read-only "Repeated" rows.

import { addDaysISO, daysBetweenISO, isValidISO, todayISO } from "./weekDates";

export const FREQUENCY_OPTIONS = [
  { value: "once", label: "Does not repeat (Once)" },
  { value: "daily", label: "Daily" },
  { value: "weekday", label: "Every weekday (Mon–Fri)" },
  { value: "weekly", label: "Weekly on its day" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly (every 3 months)" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom…" },
];

export const isRecurring = (frequency) => !!frequency && frequency !== "once";

const MAX_OCCURRENCES = 366; // hard safety cap (never generate more than this)
const CAP_WEEKS = 52; // horizon for "never ends"

const parse = (iso) => iso.split("-").map(Number);
const fmt = (y, m, d) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const daysInMonth = (year, month1) => new Date(year, month1, 0).getDate();
const weekdayOf = (iso) => {
  const [y, m, d] = parse(iso);
  return new Date(y, m - 1, d).getDay(); // 0 Sun … 6 Sat
};

const addMonthsISO = (iso, n) => {
  const [y, m, d] = parse(iso);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(d, daysInMonth(ny, nm)));
};
const addYearsISO = (iso, n) => {
  const [y, m, d] = parse(iso);
  return fmt(y + n, m, Math.min(d, daysInMonth(y + n, m)));
};

// All dates a master occurs on (including its own first date), in order.
// `recurDays` (0=Sun … 6=Sat) only applies to Custom · every N weeks: it picks
// which weekdays inside each Nth week the task lands on (e.g. Mon + Fri).
export const occurrenceDates = (
  firstISO,
  frequency,
  recurEnd = {},
  recurCustom = {},
  recurDays = []
) => {
  if (!isValidISO(firstISO)) return [];
  if (!isRecurring(frequency)) return [firstISO];

  const endType = recurEnd.type || "never";
  const maxCount =
    endType === "count" ? Math.max(1, Number(recurEnd.count) || 1) : MAX_OCCURRENCES;
  // An end date before the start makes no sense — never let it cut off the start
  // date itself, so the series always keeps at least its first date.
  const rawUntil =
    endType === "until" && isValidISO(recurEnd.until) ? recurEnd.until : null;
  const untilISO = rawUntil && rawUntil < firstISO ? firstISO : rawUntil;
  // Rolling horizon for "never": keep ~1 year of upcoming dates measured from
  // TODAY (or the start date, if that's still in the future), so a long-running
  // series keeps extending as time passes instead of stopping a year after it
  // first began.
  const horizonAnchor = firstISO > todayISO() ? firstISO : todayISO();
  const capISO = addDaysISO(horizonAnchor, CAP_WEEKS * 7);

  // Custom · every N weeks on specific weekdays (e.g. alternate Mon & Fri).
  const days =
    Array.isArray(recurDays) && recurDays.length
      ? [...new Set(recurDays)].sort((a, b) => a - b)
      : [];
  if (frequency === "custom" && recurCustom.unit === "weeks" && days.length) {
    const interval = Math.max(1, Number(recurCustom.interval) || 1);
    const anchorSunday = addDaysISO(firstISO, -weekdayOf(firstISO)); // Sun of start week
    const out = [firstISO];
    let week = 0;
    let guard = 0;
    while (
      out.length < maxCount &&
      out.length < MAX_OCCURRENCES &&
      guard < MAX_OCCURRENCES * 2
    ) {
      guard += 1;
      const weekStart = addDaysISO(anchorSunday, week * interval * 7);
      if (untilISO && weekStart > untilISO) break;
      if (endType === "never" && weekStart > capISO) break;
      for (const wd of days) {
        const date = addDaysISO(weekStart, wd);
        if (date <= firstISO) continue; // start date already in `out`
        if (untilISO && date > untilISO) continue;
        if (endType === "never" && date > capISO) continue;
        if (out.length >= maxCount || out.length >= MAX_OCCURRENCES) break;
        out.push(date);
      }
      week += 1;
    }
    return [...new Set(out)].sort();
  }

  // Monthly/annually are computed from the FIRST date by index so the
  // day-of-month never drifts (Jan 31 → Feb 28 → Mar 31, not → Mar 28). The
  // others step from the current date.
  const next = (iso, index) => {
    switch (frequency) {
      case "daily":
        return addDaysISO(iso, 1);
      case "weekday": {
        let n = addDaysISO(iso, 1);
        while (weekdayOf(n) === 0 || weekdayOf(n) === 6) n = addDaysISO(n, 1);
        return n;
      }
      case "weekly":
        return addDaysISO(iso, 7);
      case "monthly":
        return addMonthsISO(firstISO, index);
      case "quarterly":
        return addMonthsISO(firstISO, index * 3);
      case "annually":
        return addYearsISO(firstISO, index);
      case "custom": {
        const interval = Math.max(1, Number(recurCustom.interval) || 1);
        return recurCustom.unit === "weeks"
          ? addDaysISO(iso, interval * 7)
          : addDaysISO(iso, interval);
      }
      default:
        return null;
    }
  };

  const out = [];
  let cur = firstISO;
  while (out.length < maxCount && out.length < MAX_OCCURRENCES) {
    if (untilISO && cur > untilISO) break;
    if (endType === "never" && cur > capISO) break;
    out.push(cur);
    const nxt = next(cur, out.length);
    if (!nxt || nxt === cur) break;
    cur = nxt;
  }
  return out;
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const ordinalOf = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// Human summary of a recurrence. With an `anchorISO` date, weekly/monthly/
// annually read specifically — "Weekly on Wednesday", "Monthly on the 3rd",
// "Annually on June 3" — matching the main-task button.
export const describeRecurrence = (
  frequency,
  recurEnd = {},
  recurCustom = {},
  recurDays = [],
  anchorISO = ""
) => {
  if (!isRecurring(frequency)) return "Does not repeat";
  let base =
    FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label || "Repeats";
  if (frequency === "custom") {
    const n = Math.max(1, Number(recurCustom.interval) || 1);
    const unit = recurCustom.unit === "days" ? "day" : "week";
    base = `Every ${n} ${unit}${n > 1 ? "s" : ""}`;
    const days =
      Array.isArray(recurDays) && recurDays.length
        ? [...new Set(recurDays)].sort((a, b) => a - b)
        : [];
    if (recurCustom.unit === "weeks" && days.length) {
      base += ` on ${days.map((d) => DAY_ABBR[d]).join(", ")}`;
    }
  } else if (isValidISO(anchorISO)) {
    const [y, m, d] = anchorISO.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (frequency === "weekly") base = `Weekly on ${WEEKDAY_FULL[dt.getDay()]}`;
    else if (frequency === "monthly") base = `Monthly on the ${ordinalOf(d)}`;
    else if (frequency === "quarterly")
      base = `Quarterly on the ${ordinalOf(d)}`;
    else if (frequency === "annually") base = `Annually on ${MONTH_FULL[m - 1]} ${d}`;
  }
  const endType = recurEnd.type || "never";
  if (endType === "count") return `${base} · ${recurEnd.count || 1} times`;
  if (endType === "until" && recurEnd.until) return `${base} · until ${recurEnd.until}`;
  return base;
};

// iCalendar BYDAY codes, indexed by JS weekday (0=Sun … 6=Sat).
const RRULE_BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Translate the planner's recurrence into an iCalendar RRULE string (e.g.
// "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;COUNT=6"), used when exporting a
// task to Google Calendar as a recurring event. Returns "" for non-repeating.
export const toRRULE = (
  frequency,
  recurEnd = {},
  recurCustom = {},
  recurDays = []
) => {
  if (!isRecurring(frequency)) return "";
  const parts = [];
  const days =
    Array.isArray(recurDays) && recurDays.length
      ? [...new Set(recurDays)].sort((a, b) => a - b)
      : [];
  switch (frequency) {
    case "daily":
      parts.push("FREQ=DAILY");
      break;
    case "weekday":
      parts.push("FREQ=WEEKLY", "BYDAY=MO,TU,WE,TH,FR");
      break;
    case "weekly":
      parts.push("FREQ=WEEKLY");
      break;
    case "monthly":
      parts.push("FREQ=MONTHLY");
      break;
    case "quarterly":
      parts.push("FREQ=MONTHLY", "INTERVAL=3");
      break;
    case "annually":
      parts.push("FREQ=YEARLY");
      break;
    case "custom": {
      const n = Math.max(1, Number(recurCustom.interval) || 1);
      if (recurCustom.unit === "days") {
        parts.push("FREQ=DAILY", `INTERVAL=${n}`);
      } else {
        parts.push("FREQ=WEEKLY", `INTERVAL=${n}`);
        if (days.length)
          parts.push(`BYDAY=${days.map((d) => RRULE_BYDAY[d]).join(",")}`);
      }
      break;
    }
    default:
      return "";
  }
  const endType = recurEnd.type || "never";
  if (endType === "count") {
    parts.push(`COUNT=${Math.max(1, Number(recurEnd.count) || 1)}`);
  } else if (endType === "until" && isValidISO(recurEnd.until)) {
    // Date-form UNTIL (end of that day) — accepted by Google Calendar.
    parts.push(`UNTIL=${recurEnd.until.replace(/-/g, "")}T235959Z`);
  }
  return `RRULE:${parts.join(";")}`;
};

const newId = (prefix) =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyWeek = () => ({
  commitments: [],
  actions: [],
  otherCommitments: [],
  stopDoingNow: [],
  watchoutReasons: [],
  lastWeekInsights: {},
});

// Fields that are per-occurrence bookkeeping / series-master metadata and must
// NOT be carried verbatim onto a generated copy — each copy gets fresh values
// for these. Everything else the user filled (category, purpose, result/
// description, duration, from/to time, delegate, …) IS copied so a repeat row
// arrives fully populated and editable.
const stripForCopy = (master) => {
  const {
    id,
    seriesId,
    seriesLabel,
    recurSubIds,
    recurSubSkips,
    recurSkips,
    recurEnd,
    recurCustom,
    recurDays,
    frequency,
    progress,
    scored,
    gapReason,
    reasonNotDone,
    collapsed,
    isRepeat,
    isPlaceholder,
    placeholderFor,
    rideAlong,
    slotDate,
    copyWeek,
    carrySource,
    actualDuration,
    targetDate,
    executionDate,
    ...rest
  } = master || {};
  return rest;
};

// A full repeat copy of a GOAL: every filled field carried, fresh score/reason,
// pinned to one occurrence date inside its week (`copyWeek`). Once per week.
const goalCopy = (master, seriesId, date, copyWeek, label) => ({
  ...stripForCopy(master),
  id: newId("c"),
  targetDate: date,
  progress: 0,
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  collapsed: false,
  frequency: "once",
  isRepeat: true,
  seriesId,
  copyWeek,
  seriesLabel: label,
});

// A full repeat copy of a SUB-ACTION. `rideAlong` = follows a recurring goal;
// otherwise it repeats on its own schedule under a carrier goal.
const subCopy = (masterSub, parentId, seriesId, date, copyWeek, label, rideAlong) => ({
  ...stripForCopy(masterSub),
  id: newId("a"),
  parentCommitmentId: parentId,
  executionDate: date,
  actualDuration: "",
  progress: 0,
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  collapsed: false,
  frequency: "once",
  isRepeat: true,
  rideAlong,
  slotDate: date,
  copyWeek,
  seriesId,
  seriesLabel: label,
});

// Carrier goal for repeated orphan sub-actions: a real, editable goal row that
// inherits the ORIGINAL parent goal's name/category/purpose (the user can clear
// it to leave it blank). One per original parent goal per week, reused across
// reconciles via `placeholderFor` so the user's edits stick.
const carrierGoal = (parentMaster, placeholderFor) => ({
  ...stripForCopy(parentMaster || {}),
  id: newId("c"),
  result: (parentMaster && parentMaster.result) || "",
  targetDate: "",
  progress: 0,
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  collapsed: false,
  frequency: "once",
  isRepeat: false,
  isPlaceholder: true,
  placeholderFor,
});

// A full repeat copy of an Other Things item: every filled field carried.
const otherCopy = (master, seriesId, date, copyWeek, label) => ({
  ...stripForCopy(master),
  id: newId("o"),
  targetDate: date,
  actualDuration: "",
  progress: 0,
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  frequency: "once",
  isRepeat: true,
  seriesId,
  copyWeek,
  seriesLabel: label,
});

// Reconcile every recurring series across the whole week-map. Pure: returns a
// new map, never mutates the input. `resolveWeekStart(dateISO)` maps a calendar
// date to the start-key of the (possibly variable-length) week that contains
// it.
//
// ONCE-PER-WEEK model: a task that occurs many times in a week (daily, 3×/week,
// …) shows as a SINGLE row in each future week — the frequency badge conveys
// the cadence. So we generate at most one copy per series per week, pinned to
// the earliest occurrence that lands in that week. `recurSkips` holds the
// WEEK-START keys the user removed; `recurSubSkips` (goal level) holds
// `subId|weekStart` keys for individual ride-along sub-actions removed.
export const reconcileRecurrence = (weeksMap, resolveWeekStart) => {
  if (typeof resolveWeekStart !== "function") return weeksMap;

  // Deep-ish clone of the lists we touch.
  const map = {};
  Object.keys(weeksMap).forEach((key) => {
    const w = weeksMap[key] || {};
    map[key] = {
      ...w,
      commitments: [...(w.commitments || [])],
      actions: [...(w.actions || [])],
      otherCommitments: [...(w.otherCommitments || [])],
    };
  });
  const ensureWeek = (key) => {
    if (!map[key]) map[key] = emptyWeek();
  };

  // The set of weeks a master should appear in: Map<weekStart, earliestDate>,
  // excluding the master's OWN week and any weeks the user skipped.
  const targetWeeksFor = (firstISO, master) => {
    const dates = occurrenceDates(
      firstISO,
      master.frequency,
      master.recurEnd,
      master.recurCustom,
      master.recurDays
    );
    const masterWeek = resolveWeekStart(firstISO);
    const skips = new Set(master.recurSkips || []);
    const weeks = new Map();
    dates.forEach((d) => {
      const wk = resolveWeekStart(d);
      if (wk === masterWeek) return; // master already occupies its own week
      if (skips.has(wk)) return;
      const cur = weeks.get(wk);
      if (!cur || d < cur) weeks.set(wk, d);
    });
    return weeks;
  };

  // Pass 1: give every master a stable seriesId (write back into the clone).
  Object.keys(map).forEach((key) => {
    map[key].commitments = map[key].commitments.map((c) =>
      isRecurring(c.frequency) && !c.isRepeat && !c.seriesId
        ? { ...c, seriesId: c.id }
        : c
    );
    map[key].otherCommitments = map[key].otherCommitments.map((o) =>
      isRecurring(o.frequency) && !o.isRepeat && !o.seriesId
        ? { ...o, seriesId: o.id }
        : o
    );
    // Sub-actions that repeat on their OWN schedule are masters too.
    map[key].actions = map[key].actions.map((a) =>
      isRecurring(a.frequency) && !a.isRepeat && !a.seriesId
        ? { ...a, seriesId: a.id }
        : a
    );
  });

  // Track which (seriesId|weekStart) copies are legitimate this pass.
  const validGoalKeys = new Set();
  const validOtherKeys = new Set();
  const validSubKeys = new Set();

  // Refresh an existing copy so it MIRRORS the master's current schedule and
  // content (frequency badge, dates, category, duration, …) while keeping its own
  // identity and that week's review outcomes (score, actual time, gap reason).
  // This is what makes a frequency/details change on the master flow through to
  // every future week instead of leaving the old copy behind.
  //
  // EXCEPTION — a copy the user has hand-edited in its own week (`userEdited`) is
  // "detached": we keep ALL of the user's content (date, time, duration, text,
  // category, …) exactly as left and only refresh the series wiring + badge, so
  // a per-week tweak survives every later Save instead of snapping back to the
  // master's values. (Bulk "apply to all" from the master edit dialog still
  // overrides these deliberately; deleting the week's copy still removes it.)
  const mirror = (existing, fresh) => {
    if (existing.userEdited) {
      return {
        ...existing,
        seriesId: fresh.seriesId,
        copyWeek: fresh.copyWeek,
        seriesLabel: fresh.seriesLabel,
        isRepeat: true,
        userEdited: true,
        ...(fresh.parentCommitmentId !== undefined
          ? { parentCommitmentId: fresh.parentCommitmentId }
          : {}),
        ...(fresh.rideAlong !== undefined ? { rideAlong: fresh.rideAlong } : {}),
      };
    }
    return {
      ...fresh,
      id: existing.id,
      progress: existing.progress || 0,
      scored: existing.scored || false,
      gapReason: existing.gapReason || {},
      reasonNotDone: existing.reasonNotDone || "",
      actualDuration: existing.actualDuration || "",
      collapsed: existing.collapsed || false,
    };
  };

  // Pass 2: goals (and the sub-actions that ride along with them).
  Object.keys(map).forEach((weekKey) => {
    map[weekKey].commitments.forEach((master) => {
      if (!isRecurring(master.frequency) || master.isRepeat || master.isPlaceholder)
        return;
      if (!isValidISO(master.targetDate)) return; // needs a date to repeat
      const seriesId = master.seriesId || master.id;
      const label = describeRecurrence(
        master.frequency,
        master.recurEnd,
        master.recurCustom,
        master.recurDays,
        master.targetDate
      );
      const repeatSubIds = master.recurSubIds || [];
      const subSkips = new Set(master.recurSubSkips || []);
      // Ride-along master sub-actions (live in the master's own week).
      const masterSubs = map[weekKey].actions.filter(
        (a) =>
          a.parentCommitmentId === master.id &&
          repeatSubIds.includes(a.id) &&
          !isRecurring(a.frequency)
      );
      masterSubs.forEach((ms) => {
        if (!ms.seriesId) {
          map[weekKey].actions = map[weekKey].actions.map((a) =>
            a.id === ms.id ? { ...a, seriesId: a.id } : a
          );
        }
      });

      // Each ride-along sub keeps its OWN day, not the goal's — and it keeps the
      // SAME GAP before the result that the user set in the master week. So if
      // the action sits N days before the goal originally (e.g. Wed, 4 days
      // before a Sunday goal), every repeat places it N days before THAT week's
      // goal copy: its own weekday, always before the result, always in the same
      // week as the result. This beats re-deriving the sub's date independently,
      // which for monthly/annually could land it in a different 7-day week than
      // the goal and get it stacked back onto the goal's day. Map: ms.id -> gap
      // (whole days the sub is before the goal; never negative).
      const subGaps = new Map();
      masterSubs.forEach((ms) => {
        const gap =
          isValidISO(ms.executionDate) && isValidISO(master.targetDate)
            ? Math.max(0, daysBetweenISO(ms.executionDate, master.targetDate))
            : 0;
        subGaps.set(ms.id, gap);
      });

      const weeks = targetWeeksFor(master.targetDate, master);
      weeks.forEach((firstDate, targetWeek) => {
        validGoalKeys.add(`${seriesId}|${targetWeek}`);
        ensureWeek(targetWeek);
        // Find this series' existing copy for the week (by series+week, since its
        // id differs from a freshly-built one), then mirror it from the master so
        // a changed schedule/details shows here too.
        const existing = map[targetWeek].commitments.find(
          (c) => c.isRepeat && c.seriesId === seriesId && c.copyWeek === targetWeek
        );
        const fresh = goalCopy(master, seriesId, firstDate, targetWeek, label);
        const copy = existing ? mirror(existing, fresh) : fresh;
        map[targetWeek].commitments = existing
          ? map[targetWeek].commitments.map((c) => (c.id === existing.id ? copy : c))
          : [...map[targetWeek].commitments, copy];
        const copyDate = copy.targetDate || firstDate;
        masterSubs.forEach((ms) => {
          const subSeriesId = ms.seriesId || ms.id;
          if (subSkips.has(`${ms.id}|${targetWeek}`)) return;
          validSubKeys.add(`${subSeriesId}|${targetWeek}`);
          // Place the sub the SAME number of days before this week's goal copy
          // as it was before the goal in the master week — its own weekday,
          // always before the result, always inside the result's week. Clamp so
          // it never crosses below this week's start.
          const gap = subGaps.get(ms.id) || 0;
          const weekStartISO = targetWeek;
          let subDate = addDaysISO(copyDate, -gap);
          if (subDate < weekStartISO) subDate = weekStartISO;
          const freshSub = subCopy(
            ms,
            copy.id,
            subSeriesId,
            subDate,
            targetWeek,
            label,
            true
          );
          const existingSub = map[targetWeek].actions.find(
            (a) =>
              a.isRepeat &&
              a.seriesId === subSeriesId &&
              a.copyWeek === targetWeek &&
              a.parentCommitmentId === copy.id
          );
          map[targetWeek].actions = existingSub
            ? map[targetWeek].actions.map((a) =>
                a.id === existingSub.id ? mirror(existingSub, freshSub) : a
              )
            : [...map[targetWeek].actions, freshSub];
        });
      });
    });

    // Other Things
    map[weekKey].otherCommitments.forEach((master) => {
      if (!isRecurring(master.frequency) || master.isRepeat) return;
      if (!isValidISO(master.targetDate)) return;
      const seriesId = master.seriesId || master.id;
      const label = describeRecurrence(
        master.frequency,
        master.recurEnd,
        master.recurCustom,
        master.recurDays,
        master.targetDate
      );
      const weeks = targetWeeksFor(master.targetDate, master);
      weeks.forEach((firstDate, targetWeek) => {
        validOtherKeys.add(`${seriesId}|${targetWeek}`);
        ensureWeek(targetWeek);
        const existing = map[targetWeek].otherCommitments.find(
          (o) => o.isRepeat && o.seriesId === seriesId && o.copyWeek === targetWeek
        );
        const fresh = otherCopy(master, seriesId, firstDate, targetWeek, label);
        map[targetWeek].otherCommitments = existing
          ? map[targetWeek].otherCommitments.map((o) =>
              o.id === existing.id ? mirror(existing, fresh) : o
            )
          : [...map[targetWeek].otherCommitments, fresh];
      });
    });
  });

  // Pass 2.5: sub-actions that repeat on their OWN schedule. They land under a
  // carrier of their original parent goal — reusing the parent's own weekly copy
  // if one exists, else one shared carrier per original parent per week (so
  // a1 + a2 group together).
  Object.keys(map).forEach((weekKey) => {
    map[weekKey].actions.forEach((master) => {
      if (master.isRepeat || !isRecurring(master.frequency)) return;
      if (!isValidISO(master.executionDate)) return; // needs a date to repeat
      const seriesId = master.seriesId || master.id;
      const label = describeRecurrence(
        master.frequency,
        master.recurEnd,
        master.recurCustom,
        master.recurDays,
        master.executionDate
      );
      const parentId = master.parentCommitmentId;
      const parentMaster = map[weekKey].commitments.find((c) => c.id === parentId);
      const parentSeriesId = parentMaster
        ? parentMaster.seriesId || parentMaster.id
        : null;

      const weeks = targetWeeksFor(master.executionDate, master);
      weeks.forEach((firstDate, targetWeek) => {
        validSubKeys.add(`${seriesId}|${targetWeek}`);
        ensureWeek(targetWeek);
        // The user chooses whether repeats land under the SAME Result (the
        // parent goal's name + details, carrierBlank false) or under a fresh
        // BLANK Result row (carrierBlank true). These are DIFFERENT carriers,
        // each tagged with its choice — so flipping the choice routes the repeat
        // to the OTHER carrier and the now-childless old carrier is dropped in
        // Pass 3. Manually-entered goals are never placeholders/repeats, so this
        // only ever overwrites the auto-generated carrier, never the user's own.
        const wantBlank = !!master.carrierBlank;
        let carrier = wantBlank
          ? // "New Result": a dedicated blank carrier, never the parent's copy.
            map[targetWeek].commitments.find(
              (c) =>
                c.isPlaceholder &&
                c.placeholderFor === parentId &&
                c.carrierBlank
            )
          : // "Same Result": prefer the parent goal's own weekly copy, else a
            // shared placeholder carrier that inherits the parent's name.
            (parentSeriesId &&
              map[targetWeek].commitments.find(
                (c) =>
                  c.isRepeat &&
                  c.seriesId === parentSeriesId &&
                  c.copyWeek === targetWeek
              )) ||
            map[targetWeek].commitments.find(
              (c) =>
                c.isPlaceholder &&
                c.placeholderFor === parentId &&
                !c.carrierBlank
            );
        if (!carrier) {
          carrier = carrierGoal(wantBlank ? null : parentMaster, parentId);
          carrier.carrierBlank = wantBlank;
          map[targetWeek].commitments = [...map[targetWeek].commitments, carrier];
        }
        const freshSub = subCopy(
          master,
          carrier.id,
          seriesId,
          firstDate,
          targetWeek,
          label,
          false
        );
        const existing = map[targetWeek].actions.find(
          (a) =>
            a.isRepeat && a.seriesId === seriesId && a.copyWeek === targetWeek
        );
        map[targetWeek].actions = existing
          ? map[targetWeek].actions.map((a) =>
              a.id === existing.id ? mirror(existing, freshSub) : a
            )
          : [...map[targetWeek].actions, freshSub];
      });
    });
  });

  // Pass 3: drop stale copies (no longer implied by any master).
  Object.keys(map).forEach((weekKey) => {
    map[weekKey].commitments = map[weekKey].commitments.filter(
      (c) => !c.isRepeat || validGoalKeys.has(`${c.seriesId}|${c.copyWeek}`)
    );
    map[weekKey].otherCommitments = map[weekKey].otherCommitments.filter(
      (o) => !o.isRepeat || validOtherKeys.has(`${o.seriesId}|${o.copyWeek}`)
    );
    const liveCommitIds = new Set(map[weekKey].commitments.map((c) => c.id));
    map[weekKey].actions = map[weekKey].actions.filter((a) => {
      if (!a.isRepeat) return true; // normal sub-actions always kept
      return (
        validSubKeys.has(`${a.seriesId}|${a.copyWeek}`) &&
        liveCommitIds.has(a.parentCommitmentId)
      );
    });
    // Carrier goals only exist to hold repeated sub-actions — drop them once
    // they have none left (their user-typed name is preserved as long as they do).
    const parentsWithChildren = new Set(
      map[weekKey].actions.map((a) => a.parentCommitmentId)
    );
    map[weekKey].commitments = map[weekKey].commitments.filter(
      (c) => !c.isPlaceholder || parentsWithChildren.has(c.id)
    );
  });

  return map;
};
