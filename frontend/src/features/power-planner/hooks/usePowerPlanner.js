import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyAction,
  createEmptyCommitment,
  createEmptyOtherCommitment,
  createEmptyWatchoutReason,
  CATEGORY_LIST,
  PURPOSE_LIST,
} from "../data/powerPlannerConstants";
import { powerPlannerSummary } from "../data/powerPlannerDummyData";
import {
  computeAnalytics,
  indexToCommitmentId,
  insertAtIndex,
  moveItem,
  normalizeGapReason,
} from "../utils/powerPlannerUtils";
import { addDaysISO, isValidISO, todayISO } from "../utils/weekDates";
import {
  isValidSchedule,
  nextWeekStart,
  prevWeekStart,
  recommendedEndFor,
  remapFutureStarts,
  scheduleFromStart,
  setWeekEnd as setWeekEndInSchedule,
  weekEndForStart,
  weekLengthDays,
  weekStartForDate,
} from "../utils/weekSchedule";
import { reconcileRecurrence, isRecurring } from "../utils/recurrence";
import { isConfigured } from "@/lib/supabase";
import {
  loadPlanner,
  queueWeeksSync,
  queueSettingsSync,
} from "@/services/ppService";

// Weeks are date-anchored now. Each week is stored under the ISO date of its
// FIRST day ("YYYY-MM-DD"); the user picks one start date and every week rolls
// +7 days from there. See utils/weekDates.js for the date math.
const STORAGE_KEY = "power-planner-weekly-data-v5";
const START_DATE_KEY = "power-planner-start-date-v1";
// The editable week boundaries (ascending week-start ISO dates). Absent / just
// [startDate] means the plain recommended 7-day grid.
const SCHEDULE_KEY = "power-planner-schedule-v1";

// One-time hard reset: wipes ALL previously-saved planner data and the chosen
// start date exactly once, so the app opens as a brand-new, empty planner. Bump
// this flag's date to trigger another clean wipe in the future.
const RESET_FLAG = "power-planner-reset-20260605b";
const performOneTimeReset = () => {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(RESET_FLAG)) return;
    Object.keys(window.localStorage)
      .filter(
        (k) =>
          k.startsWith("power-planner-weekly-data") ||
          k.startsWith("power-planner-start-date") ||
          k.startsWith("power-planner-schedule")
      )
      .forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.setItem(RESET_FLAG, "1");
  } catch {
    // ignore storage errors
  }
};
// User-added "Other" names for Category / Purpose / Delegate, so they reappear
// in the dropdowns next time. NOTE: this is per-browser today. When merged into
// the multi-user app, key this per signed-in user (e.g. include the user id in
// the storage key, or persist it server-side) so user X's names stay private to
// X.
const CUSTOM_OPTIONS_KEY = "power-planner-custom-options-v1";
const emptyCustomOptions = () => ({ category: [], purpose: [], delegate: [] });
const loadCustomOptions = () => {
  if (isConfigured) return emptyCustomOptions(); // hydrated from the DB after mount
  if (typeof window === "undefined") return emptyCustomOptions();
  try {
    const raw = window.localStorage.getItem(CUSTOM_OPTIONS_KEY);
    if (!raw) return emptyCustomOptions();
    const p = JSON.parse(raw) || {};
    return {
      category: Array.isArray(p.category) ? p.category : [],
      purpose: Array.isArray(p.purpose) ? p.purpose : [],
      delegate: Array.isArray(p.delegate) ? p.delegate : [],
    };
  } catch {
    return emptyCustomOptions();
  }
};
const persistCustomOptions = (o) => {
  if (isConfigured) {
    queueSettingsSync({ custom_options: o });
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_OPTIONS_KEY, JSON.stringify(o));
  } catch {
    // ignore
  }
};

// Old fixed-bucket format ({ week1..week4 }) — migrated once if still present.
const LEGACY_KEY = "power-planner-weekly-data-v4";
const LEGACY_ORDER = ["week1", "week2", "week3", "week4"];

const isWeekEmpty = (w) =>
  !w ||
  ((w.commitments || []).length === 0 &&
    (w.actions || []).length === 0 &&
    (w.otherCommitments || []).length === 0 &&
    (w.stopDoingNow || []).length === 0 &&
    (w.watchoutReasons || []).length === 0);

const createDefaultWeekData = () => ({
  commitments: [],
  actions: [],
  otherCommitments: [],
  stopDoingNow: [],
  watchoutReasons: [],
  lastWeekInsights: {
    aResults: "",
    aLearning: "",
    cOtherThings: "",
    cLearning: "",
    dUnproductive: "",
    dLearning: "",
    eReasons: "",
    eLearning: "",
  },
});

const normalizeRowGapReason = (row) =>
  row && typeof row === "object"
    ? { ...row, gapReason: normalizeGapReason(row.gapReason) }
    : row;

// Normalize one week's stored object so every list/field exists with sane types.
const normalizeWeek = (week) => {
  const defaults = createDefaultWeekData();
  if (!week || typeof week !== "object") return defaults;
  return {
    ...defaults,
    ...week,
    commitments: (week.commitments || []).map(normalizeRowGapReason),
    actions: (week.actions || []).map(normalizeRowGapReason),
    otherCommitments: (week.otherCommitments || []).map(normalizeRowGapReason),
    stopDoingNow: (week.stopDoingNow || []).map(normalizeRowGapReason),
    watchoutReasons: week.watchoutReasons || [],
    lastWeekInsights: {
      ...defaults.lastWeekInsights,
      ...(week.lastWeekInsights || {}),
    },
  };
};

// Storage map shape: { [weekStartISO]: weekData }.
const normalizeWeeksMap = (raw) => {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.keys(raw).forEach((key) => {
    if (!isValidISO(key)) return;
    out[key] = normalizeWeek(raw[key]);
  });
  return out;
};

// With Supabase connected, weeks/settings persist to the user's account
// (debounced + diffed in ppService); localStorage is the demo-only fallback so
// two users on one device never see each other's plan.
const persistWeeks = (map) => {
  if (isConfigured) {
    queueWeeksSync(map);
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
};

const persistStartDate = (iso) => {
  if (isConfigured) {
    queueSettingsSync({ start_date: iso || null });
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(START_DATE_KEY, iso);
  } catch {
    // ignore
  }
};

const loadStartDate = () => {
  if (isConfigured) return ""; // hydrated from the DB after mount
  if (typeof window === "undefined") return "";
  try {
    performOneTimeReset();
    const saved = window.localStorage.getItem(START_DATE_KEY) || "";
    return isValidISO(saved) ? saved : "";
  } catch {
    return "";
  }
};

const persistSchedule = (schedule) => {
  if (isConfigured) {
    queueSettingsSync({ schedule });
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  } catch {
    // ignore
  }
};

// Load the saved week boundaries. Falls back to the plain 7-day grid built from
// the saved start date, so existing users (who have no schedule yet) are
// unaffected.
const loadSchedule = () => {
  const start = loadStartDate();
  const fallback = scheduleFromStart(start);
  if (isConfigured) return fallback; // hydrated from the DB after mount
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SCHEDULE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (isValidSchedule(parsed) && (!start || parsed[0] === start)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
};

const loadWeeksMap = () => {
  if (isConfigured) return {}; // hydrated from the DB after mount
  if (typeof window === "undefined") return {};
  try {
    performOneTimeReset();
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    return normalizeWeeksMap(JSON.parse(saved));
  } catch (error) {
    console.warn("Power Planner: failed to parse saved data", error);
    return {};
  }
};

// One-time bridge: if there's nothing in the new date-keyed store yet but the
// old week1..week4 data is still around, lay those four weeks onto the first
// four real weeks starting at the user's chosen start date. Nothing is lost.
const migrateLegacyIntoMap = (map, startISO) => {
  if (!startISO || !isValidISO(startISO)) return map;
  if (Object.keys(map).length > 0) return map;
  if (typeof window === "undefined") return map;
  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return map;
    const legacy = JSON.parse(legacyRaw);
    const migrated = {};
    LEGACY_ORDER.forEach((key, index) => {
      const week = legacy?.[key];
      if (week && !isWeekEmpty(week)) {
        migrated[addDaysISO(startISO, index * 7)] = normalizeWeek(week);
      }
    });
    if (Object.keys(migrated).length > 0) persistWeeks(migrated);
    return Object.keys(migrated).length > 0 ? migrated : map;
  } catch {
    return map;
  }
};

// Build a fresh, editable plan from a previous week: keep the structure (goals,
// sub-actions, other things, to-stop) but give every row a new id and clear all
// progress / actuals so it's a clean slate to adjust.
const clonePlanFromWeek = (source) => {
  const newId = (prefix) =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const idMap = {};
  const commitments = (source.commitments || []).map((c) => {
    const id = newId("c");
    idMap[c.id] = id;
    return { ...c, id, progress: 0, scored: false, collapsed: false, carrySource: undefined };
  });
  const actions = (source.actions || []).map((a) => ({
    ...a,
    id: newId("a"),
    parentCommitmentId: idMap[a.parentCommitmentId] || a.parentCommitmentId,
    progress: 0,
    scored: false,
    actualDuration: "",
    gapReason: {},
    collapsed: false,
    carrySource: undefined,
  }));
  const otherCommitments = (source.otherCommitments || []).map((o) => ({
    ...o,
    id: newId("o"),
    progress: 0,
    scored: false,
    actualDuration: "",
    gapReason: {},
    carrySource: undefined,
  }));
  const stopDoingNow = (source.stopDoingNow || []).map((s) => ({
    ...s,
    id: newId("stop"),
    done: "",
  }));
  return {
    ...createDefaultWeekData(),
    commitments,
    actions,
    otherCommitments,
    stopDoingNow,
  };
};

const usePowerPlanner = () => {
  const [focusTab, setFocusTab] = useState("topGoals");

  // The editable week boundaries. schedule[0] is Week 1's start; every later
  // week defaults to a recommended 7-day Mon–Sun block but can be resized.
  const [schedule, setSchedule] = useState(loadSchedule);
  // A ref so the many recurrence callbacks always reconcile against the latest
  // schedule without each having to list it as a dependency.
  const scheduleRef = useRef(schedule);
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);
  const resolveWeekStart = useCallback(
    (dateISO) => weekStartForDate(scheduleRef.current, dateISO),
    []
  );

  // The start date (= first boundary) the user chose. Empty until they set it.
  const startDate = schedule[0] || "";
  const hasStartDate = isValidISO(startDate);

  // The week that contains "today" (clamped to never precede the start date).
  const currentWeekStart = useMemo(
    () => (hasStartDate ? weekStartForDate(schedule, todayISO()) : ""),
    [hasStartDate, schedule]
  );

  const [selectedWeek, setSelectedWeek] = useState(() => {
    const sched = loadSchedule();
    return isValidSchedule(sched) ? weekStartForDate(sched, todayISO()) : "";
  });

  const [weeksData, setWeeksData] = useState(() =>
    migrateLegacyIntoMap(loadWeeksMap(), loadStartDate())
  );
  const [savedWeeksData, setSavedWeeksData] = useState(() =>
    migrateLegacyIntoMap(loadWeeksMap(), loadStartDate())
  );

  // User-remembered "Other" names for the dropdowns (see CUSTOM_OPTIONS_KEY).
  const [customOptions, setCustomOptions] = useState(loadCustomOptions);

  // Hydrate the signed-in user's plan from Supabase (weeks + settings). The
  // local initializers above start empty when configured, so nothing from a
  // previous user on this device ever shows.
  useEffect(() => {
    if (!isConfigured) return;
    let active = true;
    loadPlanner()
      .then((db) => {
        if (!active || !db) return;
        const sched =
          isValidSchedule(db.schedule) ? db.schedule
          : isValidISO(db.startDate) ? scheduleFromStart(db.startDate)
          : null;
        if (sched) {
          setSchedule(sched);
          setSelectedWeek(weekStartForDate(sched, todayISO()));
        }
        const weeks = normalizeWeeksMap(db.weeks || {});
        setWeeksData(weeks);
        setSavedWeeksData(weeks);
        if (db.customOptions) {
          setCustomOptions({
            category: db.customOptions.category || [],
            purpose: db.customOptions.purpose || [],
            delegate: db.customOptions.delegate || [],
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a save, learn any new "Other" names the user typed so they appear in
  // the dropdowns from now on.
  const learnCustomOptions = useCallback((map) => {
    setCustomOptions((prev) => {
      const cat = new Set(prev.category);
      const pur = new Set(prev.purpose);
      const del = new Set(prev.delegate);
      const scan = (r) => {
        if (!r) return;
        if (r.category === "Other" && r.customCategory?.trim())
          cat.add(r.customCategory.trim());
        if (r.purpose === "Other" && r.customPurpose?.trim())
          pur.add(r.customPurpose.trim());
        if (r.assignedTo === "Other" && r.customDoneBy?.trim())
          del.add(r.customDoneBy.trim());
      };
      Object.values(map || {}).forEach((w) => {
        (w.commitments || []).forEach(scan);
        (w.actions || []).forEach(scan);
        (w.otherCommitments || []).forEach(scan);
      });
      const next = {
        category: [...cat],
        purpose: [...pur],
        delegate: [...del],
      };
      persistCustomOptions(next);
      return next;
    });
  }, []);

  // Remove a name the user added by mistake from their remembered list.
  const removeCustomOption = useCallback((type, value) => {
    setCustomOptions((prev) => {
      if (!prev[type]) return prev;
      const next = { ...prev, [type]: prev[type].filter((v) => v !== value) };
      persistCustomOptions(next);
      return next;
    });
  }, []);

  // Dropdown option lists = base lists + the user's remembered names + "Other".
  const categoryOptions = useMemo(() => {
    const extra = customOptions.category.filter((c) => !CATEGORY_LIST.includes(c));
    return ["", ...CATEGORY_LIST, ...extra, "Other"];
  }, [customOptions.category]);
  const purposeOptions = useMemo(() => {
    const extra = customOptions.purpose.filter((p) => !PURPOSE_LIST.includes(p));
    return ["", ...PURPOSE_LIST, ...extra, "Other"];
  }, [customOptions.purpose]);
  const assigneeOptions = useMemo(() => {
    const extra = customOptions.delegate.filter(
      (d) => d !== "Self" && d !== "Other"
    );
    return ["Self", ...extra, "Other"];
  }, [customOptions.delegate]);

  const [carrySelectedSubIds, setCarrySelectedSubIds] = useState([]);
  const [carrySelectedOtherIds, setCarrySelectedOtherIds] = useState([]);
  const [carryForwardTag, setCarryForwardTag] = useState("");
  const [carryForwardChoice, setCarryForwardChoice] = useState("yes");

  // Which section is unlocked for editing: "topGoals" | "otherThings" |
  // "toStop" | "review" | null.
  const [editingSection, setEditingSection] = useState(null);

  // Choosing / changing the start date re-anchors the weeks and jumps to the
  // current week of the new anchor. Because week buckets shift, we PURGE every
  // generated repeat and regenerate them against the new anchor — a clean
  // overwrite, so no duplicate copies are left behind.
  const stripRepeats = (w) => ({
    ...w,
    commitments: (w.commitments || []).filter((c) => !c.isRepeat),
    otherCommitments: (w.otherCommitments || []).filter((o) => !o.isRepeat),
    actions: (w.actions || []).filter((a) => !a.isRepeat),
  });

  const reanchor = (map, newSchedule) => {
    const migrated = migrateLegacyIntoMap(map, newSchedule[0]);
    const purged = {};
    Object.keys(migrated).forEach((wk) => {
      purged[wk] = stripRepeats(migrated[wk]);
    });
    return reconcileRecurrence(purged, (d) => weekStartForDate(newSchedule, d));
  };

  // Resizing a week shifts every LATER week's start. Re-key the saved data so
  // each future week's content follows it to its new boundary, then regenerate
  // repeats against the new schedule. Past weeks and the edited week itself keep
  // their key.
  const applyResize = (map, oldSchedule, newSchedule, fromStartISO) => {
    const keys = Object.keys(map);
    const maxKey = keys.length ? [...keys].sort().slice(-1)[0] : fromStartISO;
    const remap = remapFutureStarts(oldSchedule, newSchedule, fromStartISO, maxKey);
    const out = {};
    keys.forEach((k) => {
      if (k <= fromStartISO) out[k] = stripRepeats(map[k]);
    });
    keys.forEach((k) => {
      if (k > fromStartISO) {
        const targetKey = remap[k] || k;
        if (!out[targetKey] || isWeekEmpty(out[targetKey])) {
          out[targetKey] = stripRepeats(map[k]);
        }
      }
    });
    return reconcileRecurrence(out, (d) => weekStartForDate(newSchedule, d));
  };

  // Choose / change Week 1's start AND end. Re-anchors the whole grid, jumps to
  // the current week, and rebuilds every repeat against the new schedule.
  const setStartDate = useCallback((startISO, endISO) => {
    if (!isValidISO(startISO)) return;
    let newSchedule = scheduleFromStart(startISO);
    if (isValidISO(endISO)) {
      newSchedule = setWeekEndInSchedule(newSchedule, startISO, endISO);
    }
    persistStartDate(startISO);
    persistSchedule(newSchedule);
    setSchedule(newSchedule);
    setSelectedWeek(weekStartForDate(newSchedule, todayISO()));
    setSavedWeeksData((prev) => {
      const next = reanchor(prev, newSchedule);
      persistWeeks(next);
      return next;
    });
    setWeeksData((prev) => reanchor(prev, newSchedule));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize one week by setting its END date (current/future weeks only; past
  // weeks are locked). Persists the new boundaries and migrates affected data.
  const setWeekEnd = useCallback((weekStartISO, endISO) => {
    if (!isValidISO(weekStartISO) || !isValidISO(endISO)) return;
    const oldSchedule = scheduleRef.current;
    const newSchedule = setWeekEndInSchedule(oldSchedule, weekStartISO, endISO);
    if (newSchedule === oldSchedule) return; // end before start → ignored
    persistSchedule(newSchedule);
    setSchedule(newSchedule);
    setSavedWeeksData((prev) => {
      const next = applyResize(prev, oldSchedule, newSchedule, weekStartISO);
      persistWeeks(next);
      return next;
    });
    setWeeksData((prev) => applyResize(prev, oldSchedule, newSchedule, weekStartISO));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentWeekData = weeksData[selectedWeek] || createDefaultWeekData();
  const commitments = currentWeekData.commitments;
  const actions = currentWeekData.actions;
  const otherCommitments = currentWeekData.otherCommitments;
  const stopDoingNow = currentWeekData.stopDoingNow;
  const watchoutReasons = currentWeekData.watchoutReasons || [];
  const lastWeekInsights = currentWeekData.lastWeekInsights;

  const savedWeekData = savedWeeksData[selectedWeek] || createDefaultWeekData();
  const savedCommitments = savedWeekData.commitments;
  const savedActions = savedWeekData.actions;
  const savedOtherCommitments = savedWeekData.otherCommitments;
  const savedStopDoingNow = savedWeekData.stopDoingNow;
  const savedWatchoutReasons = savedWeekData.watchoutReasons || [];

  const updateCurrentWeek = useCallback(
    (updater) => {
      setWeeksData((prev) => {
        const current = prev[selectedWeek] || createDefaultWeekData();
        return {
          ...prev,
          [selectedWeek]: updater(current),
        };
      });
    },
    [selectedWeek]
  );

  const commitmentIds = useMemo(
    () => commitments.map((_, index) => indexToCommitmentId(index)),
    [commitments]
  );

  const otherCommitmentIds = useMemo(
    () => otherCommitments.map((_, index) => indexToCommitmentId(index)),
    [otherCommitments]
  );

  // Analytics (dashboard cards) read from SAVED data so the dashboard only updates after Save
  const analytics = useMemo(
    () => computeAnalytics(savedCommitments, savedActions),
    [savedCommitments, savedActions]
  );

  const makeListHelpers = (listKey, factory, actionsKey = null) => {
    const add = (index) =>
      updateCurrentWeek((week) => ({
        ...week,
        [listKey]: insertAtIndex(
          week[listKey],
          index ?? week[listKey].length,
          factory()
        ),
      }));

    // Editing a generated repeat copy stamps `userEdited` so reconcile keeps the
    // tweak instead of snapping it back to the master on the next Save.
    const update = (id, field, value) =>
      updateCurrentWeek((week) => ({
        ...week,
        [listKey]: week[listKey].map((row) =>
          row.id === id
            ? { ...row, [field]: value, ...(row.isRepeat ? { userEdited: true } : {}) }
            : row
        ),
      }));

    const remove = (id) =>
      updateCurrentWeek((week) => ({
        ...week,
        [listKey]: week[listKey].filter((row) => row.id !== id),
        ...(actionsKey
          ? {
              [actionsKey]: week[actionsKey].filter(
                (a) => a.parentCommitmentId !== id
              ),
            }
          : {}),
      }));

    const move = (fromIndex, toIndex) =>
      updateCurrentWeek((week) => ({
        ...week,
        [listKey]: moveItem(week[listKey], fromIndex, toIndex),
      }));

    const toggleCollapse = (id) =>
      updateCurrentWeek((week) => ({
        ...week,
        [listKey]: week[listKey].map((row) =>
          row.id === id ? { ...row, collapsed: !row.collapsed } : row
        ),
      }));

    return { add, update, remove, move, toggleCollapse };
  };

  const makeChildHelpers = (childrenKey, parentKey, factory) => {
    const add = (parentCommitmentId, insertIndex = null) =>
      updateCurrentWeek((week) => {
        const parentChildren = week[childrenKey].filter(
          (a) => a.parentCommitmentId === parentCommitmentId
        );
        const otherChildren = week[childrenKey].filter(
          (a) => a.parentCommitmentId !== parentCommitmentId
        );
        const newChild = factory(parentCommitmentId);
        const targetIndex = insertIndex === null ? parentChildren.length : insertIndex;
        const updated = insertAtIndex(parentChildren, targetIndex, newChild);
        return { ...week, [childrenKey]: [...otherChildren, ...updated] };
      });

    // Editing a generated repeat copy stamps `userEdited` so reconcile keeps the
    // tweak instead of snapping it back to the master on the next Save.
    const update = (id, field, value) =>
      updateCurrentWeek((week) => ({
        ...week,
        [childrenKey]: week[childrenKey].map((row) =>
          row.id === id
            ? { ...row, [field]: value, ...(row.isRepeat ? { userEdited: true } : {}) }
            : row
        ),
      }));

    const remove = (id) =>
      updateCurrentWeek((week) => ({
        ...week,
        [childrenKey]: week[childrenKey].filter((row) => row.id !== id),
      }));

    const move = (parentCommitmentId, fromIndex, toIndex) =>
      updateCurrentWeek((week) => {
        const parentChildren = week[childrenKey].filter(
          (a) => a.parentCommitmentId === parentCommitmentId
        );
        const otherChildren = week[childrenKey].filter(
          (a) => a.parentCommitmentId !== parentCommitmentId
        );
        const reordered = moveItem(parentChildren, fromIndex, toIndex);
        return { ...week, [childrenKey]: [...otherChildren, ...reordered] };
      });

    const toggleCollapse = (id) =>
      updateCurrentWeek((week) => ({
        ...week,
        [childrenKey]: week[childrenKey].map((row) =>
          row.id === id ? { ...row, collapsed: !row.collapsed } : row
        ),
      }));

    return { add, update, remove, move, toggleCollapse };
  };

  const commitmentHelpers = useMemo(
    () => makeListHelpers("commitments", createEmptyCommitment, "actions"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateCurrentWeek]
  );
  const actionHelpers = useMemo(
    () => makeChildHelpers("actions", "commitments", createEmptyAction),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateCurrentWeek]
  );
  const otherCommitmentHelpers = useMemo(
    () => makeListHelpers("otherCommitments", createEmptyOtherCommitment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateCurrentWeek]
  );

  const getActionsByParent = useCallback(
    (parentCommitmentId) =>
      actions.filter((action) => action.parentCommitmentId === parentCommitmentId),
    [actions]
  );

  const addStopDoingRow = useCallback(() => {
    updateCurrentWeek((week) => ({
      ...week,
      stopDoingNow: [
        ...week.stopDoingNow,
        {
          id: `stop-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          detail: "",
          weeklyTime: "",
          // Reviewed like Top Goals / Other Things: a % stopped/reduced, plus
          // TFCR + reason when it's below 100%.
          progress: 0,
          scored: false,
          gapReason: {},
          reasonNotDone: "",
        },
      ],
    }));
  }, [updateCurrentWeek]);

  const updateStopDoingRow = useCallback(
    (id, field, value) =>
      updateCurrentWeek((week) => ({
        ...week,
        stopDoingNow: week.stopDoingNow.map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        ),
      })),
    [updateCurrentWeek]
  );

  const removeStopDoingRow = useCallback(
    (id) =>
      updateCurrentWeek((week) => ({
        ...week,
        stopDoingNow: week.stopDoingNow.filter((row) => row.id !== id),
      })),
    [updateCurrentWeek]
  );

  const addWatchoutReason = useCallback(
    () =>
      updateCurrentWeek((week) => ({
        ...week,
        watchoutReasons: [...(week.watchoutReasons || []), createEmptyWatchoutReason()],
      })),
    [updateCurrentWeek]
  );

  const updateWatchoutReason = useCallback(
    (id, field, value) =>
      updateCurrentWeek((week) => ({
        ...week,
        watchoutReasons: (week.watchoutReasons || []).map((row) =>
          row.id === id ? { ...row, [field]: value } : row
        ),
      })),
    [updateCurrentWeek]
  );

  const removeWatchoutReason = useCallback(
    (id) =>
      updateCurrentWeek((week) => ({
        ...week,
        watchoutReasons: (week.watchoutReasons || []).filter((row) => row.id !== id),
      })),
    [updateCurrentWeek]
  );

  const setLastWeekInsights = useCallback(
    (updater) => {
      updateCurrentWeek((week) => ({
        ...week,
        lastWeekInsights:
          typeof updater === "function" ? updater(week.lastWeekInsights) : updater,
      }));
    },
    [updateCurrentWeek]
  );

  // Carry-forward options: keyed off each GOAL's own RESULT % (read live from the
  // draft) so lowering a goal below 100% makes it appear in Unfinished Tasks
  // immediately. We carry the GOAL ROW only (not its sub-tasks).
  const carryForwardOptions = useMemo(() => {
    const topGoals = [];
    savedCommitments.forEach((parent, parentIdx) => {
      const parentLetter = String.fromCharCode(65 + parentIdx);
      if (parent.isPlaceholder) return; // blank placeholder goals aren't carried
      const live = commitments.find((c) => c.id === parent.id) || parent;
      if ((live.progress || 0) >= 1) return;
      topGoals.push({
        id: parent.id,
        letter: parentLetter,
        label: parent.result?.trim() ? parent.result : "(empty goal)",
        progress: live.progress || 0,
      });
    });

    const otherItems = [];
    savedOtherCommitments.forEach((item, idx) => {
      const live = otherCommitments.find((o) => o.id === item.id) || item;
      if ((live.progress || 0) >= 1) return;
      otherItems.push({
        id: item.id,
        itemLetter: String.fromCharCode(65 + idx),
        label: item.result?.trim() ? item.result : "(empty item)",
        progress: live.progress || 0,
      });
    });

    return { topGoals, otherItems };
  }, [commitments, otherCommitments, savedCommitments, savedOtherCommitments]);

  const applyCarryForwardIfNeeded = useCallback(
    (sourceWeeks) => {
      if (carryForwardChoice !== "yes") {
        return { weeks: sourceWeeks, forwarded: false };
      }
      if (
        carrySelectedSubIds.length === 0 &&
        carrySelectedOtherIds.length === 0
      ) {
        return { weeks: sourceWeeks, forwarded: false };
      }
      if (!isValidISO(selectedWeek)) {
        return { weeks: sourceWeeks, forwarded: false };
      }

      // Real next week = the next boundary in the schedule.
      const nextWeekKey = nextWeekStart(scheduleRef.current, selectedWeek);
      const existingNextWeek = sourceWeeks[nextWeekKey] || createDefaultWeekData();
      // Overwrite, don't duplicate: drop anything previously carried from THIS
      // same source week, then add the fresh selection. Rows typed directly into
      // the next week (no carrySource) are left untouched.
      const nextWeek = {
        ...existingNextWeek,
        commitments: existingNextWeek.commitments.filter(
          (c) => c.carrySource !== selectedWeek
        ),
        actions: existingNextWeek.actions.filter(
          (a) => a.carrySource !== selectedWeek
        ),
        otherCommitments: existingNextWeek.otherCommitments.filter(
          (o) => o.carrySource !== selectedWeek
        ),
      };
      const tag = (carryForwardTag || "Carry Forwarded").trim();
      const prefix = tag ? `[${tag}] ` : "";

      // Carry each selected GOAL forward as a goal row only (no sub-tasks).
      carrySelectedSubIds.forEach((goalId) => {
        const parent = savedCommitments.find((c) => c.id === goalId);
        if (!parent) return;
        // Carry forward identity only — name, category, purpose. Date, duration,
        // time and frequency are intentionally left blank so the user must
        // re-schedule the task inside the NEW week (the blank date then trips the
        // required-field check). This also prevents a stale, out-of-week date
        // ever reaching the calendar.
        const newParent = {
          ...createEmptyCommitment(),
          result: `${prefix}${parent.result || "Carry-forward goal"}`,
          category: parent.category || "",
          customCategory: parent.customCategory || "",
          purpose: parent.purpose || "",
          customPurpose: parent.customPurpose || "",
          carrySource: selectedWeek,
        };
        nextWeek.commitments = [newParent, ...nextWeek.commitments];
      });

      // Carry forward selected Other Things items into next week's Other Things
      carrySelectedOtherIds.forEach((itemId) => {
        const item = savedOtherCommitments.find((row) => row.id === itemId);
        if (!item) return;
        // Same as goals: carry name, category, purpose and delegate only. Date,
        // duration and time are left blank so the item is re-scheduled in the new
        // week (and can't export to a stale date). Frequency stays "once".
        nextWeek.otherCommitments = [
          {
            ...createEmptyOtherCommitment(),
            result: `${prefix}${item.result || "Carry-forward item"}`,
            category: item.category || "",
            customCategory: item.customCategory || "",
            purpose: item.purpose || "",
            customPurpose: item.customPurpose || "",
            assignedTo: item.assignedTo || "",
            customDoneBy: item.customDoneBy || "",
            carrySource: selectedWeek,
          },
          ...nextWeek.otherCommitments,
        ];
      });

      const forwarded =
        carrySelectedSubIds.length > 0 || carrySelectedOtherIds.length > 0;
      return {
        weeks: forwarded ? { ...sourceWeeks, [nextWeekKey]: nextWeek } : sourceWeeks,
        forwarded,
      };
    },
    [
      carryForwardChoice,
      carryForwardTag,
      carrySelectedOtherIds,
      carrySelectedSubIds,
      savedCommitments,
      savedOtherCommitments,
      selectedWeek,
    ]
  );

  const savePlannerData = useCallback(
    (options = {}) => {
      const { includeCarryForward = false } = options;
      if (typeof window === "undefined") return { forwarded: false };

      const { weeks: carried, forwarded } = includeCarryForward
        ? applyCarryForwardIfNeeded(weeksData)
        : { weeks: weeksData, forwarded: false };

      // Generate / sync recurring task copies across weeks on every save.
      const nextWeeks = reconcileRecurrence(carried, resolveWeekStart);

      persistWeeks(nextWeeks);
      setWeeksData(nextWeeks);
      setSavedWeeksData(nextWeeks);
      // Remember any new "Other" names typed this save.
      learnCustomOptions(nextWeeks);
      // Saving locks the section again — user must click Edit to change it.
      setEditingSection(null);

      if (forwarded) {
        setCarrySelectedSubIds([]);
        setCarrySelectedOtherIds([]);
        setCarryForwardChoice("yes");
      }

      return { forwarded, saved: true };
    },
    [applyCarryForwardIfNeeded, weeksData, resolveWeekStart, learnCustomOptions]
  );

  // Recurring MASTERS (Goals / Other Things) whose text the user changed this
  // week, compared to what's saved. Editing a master is what triggers the
  // "this one vs the whole series" choice. (Editing a copy never asks — it just
  // edits that occurrence on its own.)
  const editedRecurringMasters = (mapWeek, savedWeek) => {
    const out = [];
    const scan = (list, savedList, listKey) => {
      (list || []).forEach((m) => {
        if (m.isRepeat || !isRecurring(m.frequency)) return;
        const prev = (savedList || []).find((s) => s.id === m.id);
        if (prev && (m.result || "") !== (prev.result || "")) {
          out.push({ seriesId: m.seriesId || m.id, text: m.result || "", listKey });
        }
      });
    };
    scan(mapWeek?.commitments, savedWeek?.commitments, "commitments");
    scan(mapWeek?.otherCommitments, savedWeek?.otherCommitments, "otherCommitments");
    return out;
  };

  const pendingRepeatEdits = useMemo(
    () =>
      editedRecurringMasters(
        weeksData[selectedWeek],
        savedWeeksData[selectedWeek]
      ),
    [weeksData, savedWeeksData, selectedWeek]
  );

  // Save after the user chose a scope for an edited recurring master.
  //   "all"  → push the master's new text onto every repeat copy in the series.
  //   "this" → leave the copies as they are; only the master's own row changes.
  const saveRepeatScope = useCallback(
    (scope) => {
      if (scope !== "all") {
        return savePlannerData({ includeCarryForward: false });
      }
      const edited = editedRecurringMasters(
        weeksData[selectedWeek],
        savedWeeksData[selectedWeek]
      );
      if (edited.length === 0) {
        return savePlannerData({ includeCarryForward: false });
      }
      const map = {};
      Object.keys(weeksData).forEach((k) => {
        const w = weeksData[k];
        map[k] = {
          ...w,
          commitments: [...(w.commitments || [])],
          actions: [...(w.actions || [])],
          otherCommitments: [...(w.otherCommitments || [])],
        };
      });
      edited.forEach(({ seriesId, text, listKey }) => {
        Object.keys(map).forEach((k) => {
          map[k][listKey] = map[k][listKey].map((r) =>
            r.isRepeat && r.seriesId === seriesId ? { ...r, result: text } : r
          );
        });
      });
      const nextWeeks = reconcileRecurrence(map, resolveWeekStart);
      persistWeeks(nextWeeks);
      setWeeksData(nextWeeks);
      setSavedWeeksData(nextWeeks);
      learnCustomOptions(nextWeeks);
      setEditingSection(null);
      return { saved: true };
    },
    [
      weeksData,
      savedWeeksData,
      selectedWeek,
      resolveWeekStart,
      savePlannerData,
      learnCustomOptions,
    ]
  );

  const beginEdit = useCallback((section) => setEditingSection(section), []);

  const cancelEdit = useCallback(() => {
    setWeeksData(savedWeeksData);
    setEditingSection(null);
  }, [savedWeeksData]);

  const periodLabel = "Plan";

  const getWeekDataByKey = useCallback(
    (weekKey) => weeksData[weekKey] || createDefaultWeekData(),
    [weeksData]
  );

  const getSavedWeekDataByKey = useCallback(
    (weekKey) => savedWeeksData[weekKey] || createDefaultWeekData(),
    [savedWeeksData]
  );

  // True when the current week's draft differs from what's saved — covers both
  // plan-section edits and Review scoring (which doesn't use editingSection).
  // Used to warn before navigating away. `collapsed` is a pure view-state flag
  // (hide/show sub-tasks) so we strip it from the comparison — toggling it must
  // never count as an unsaved edit, even while a section is locked.
  const isDirty = useMemo(() => {
    const stripCollapsed = (key, value) =>
      key === "collapsed" ? undefined : value;
    return (
      JSON.stringify(weeksData[selectedWeek] || {}, stripCollapsed) !==
      JSON.stringify(savedWeeksData[selectedWeek] || {}, stripCollapsed)
    );
  }, [weeksData, savedWeeksData, selectedWeek]);

  // Saved weeks that actually contain data, newest first — used by History.
  const savedWeekKeys = useMemo(
    () =>
      Object.keys(savedWeeksData)
        .filter((key) => !isWeekEmpty(savedWeeksData[key]))
        .sort((a, b) => (a < b ? 1 : -1)),
    [savedWeeksData]
  );

  // Copy any saved week's plan into the selected week (new ids, progress reset)
  // and persist it right away, so it survives tab switches. The user can then
  // click Edit on any section to tweak the seeded plan.
  const copyWeekPlan = useCallback(
    (sourceKey) => {
      if (!isValidISO(selectedWeek) || !isValidISO(sourceKey)) {
        return { copied: false };
      }
      const source = savedWeeksData[sourceKey];
      if (!source || isWeekEmpty(source)) return { copied: false };
      const cloned = clonePlanFromWeek(source);
      const next = { ...savedWeeksData, [selectedWeek]: cloned };
      persistWeeks(next);
      setSavedWeeksData(next);
      setWeeksData(next);
      return { copied: true };
    },
    [selectedWeek, savedWeeksData]
  );

  // Delete a recurring goal/series master. `deleteCopies` true wipes every
  // generated repeat too; false detaches them into standalone tasks. Persisted
  // immediately since copies live in other weeks. Works on saved data (copies
  // only exist after a save).
  const deleteSeriesMaster = useCallback(
    (masterId, deleteCopies) => {
      const apply = (map) => {
        // Resolve the seriesId from whichever list the master lives in.
        let seriesId = masterId;
        Object.values(map).forEach((w) => {
          const m =
            (w.commitments || []).find((c) => c.id === masterId) ||
            (w.otherCommitments || []).find((o) => o.id === masterId);
          if (m) seriesId = m.seriesId || masterId;
        });
        const out = {};
        Object.keys(map).forEach((wk) => {
          const w = map[wk];
          let commitments = (w.commitments || []).filter((c) => c.id !== masterId);
          let otherCommitments = (w.otherCommitments || []).filter(
            (o) => o.id !== masterId
          );
          let actions = (w.actions || []).filter(
            (a) => a.parentCommitmentId !== masterId
          );
          if (!deleteCopies) {
            // Detach this series' copies so reconcile leaves them as standalone.
            const detachedGoalIds = new Set(
              commitments
                .filter((c) => c.isRepeat && c.seriesId === seriesId)
                .map((c) => c.id)
            );
            commitments = commitments.map((c) =>
              c.isRepeat && c.seriesId === seriesId
                ? { ...c, isRepeat: false, seriesId: "" }
                : c
            );
            otherCommitments = otherCommitments.map((o) =>
              o.isRepeat && o.seriesId === seriesId
                ? { ...o, isRepeat: false, seriesId: "" }
                : o
            );
            actions = actions.map((a) =>
              a.isRepeat && detachedGoalIds.has(a.parentCommitmentId)
                ? { ...a, isRepeat: false, seriesId: "" }
                : a
            );
          }
          out[wk] = { ...w, commitments, otherCommitments, actions };
        });
        // If deleteCopies, the master is gone so reconcile drops its copies.
        return reconcileRecurrence(out, resolveWeekStart);
      };
      // Draft-only: a delete is an edit like any other — it touches the working
      // copy and is persisted only when the user clicks Save. This keeps the
      // edit session open instead of auto-saving and closing it.
      setWeeksData((prev) => apply(prev));
    },
    [resolveWeekStart]
  );

  // Delete a single generated repeat (a goal, Other Things item, or sub-action
  // copy): record that WEEK as a skip on the right master so reconcile won't
  // recreate it, then reconcile. Each series shows once per week, so a delete
  // removes that week's occurrence only.
  const deleteRecurringCopy = useCallback(
    (copyId) => {
      const apply = (map) => {
        let kind = null; // "goal" | "other" | "sub"
        let seriesId = null;
        let weekKey = null;
        let rideAlong = false;
        Object.values(map).forEach((w) => {
          const gc = (w.commitments || []).find(
            (c) => c.id === copyId && c.isRepeat
          );
          if (gc) {
            kind = "goal";
            seriesId = gc.seriesId;
            weekKey = gc.copyWeek || resolveWeekStart(gc.targetDate);
          }
          const oc = (w.otherCommitments || []).find(
            (o) => o.id === copyId && o.isRepeat
          );
          if (oc) {
            kind = "other";
            seriesId = oc.seriesId;
            weekKey = oc.copyWeek || resolveWeekStart(oc.targetDate);
          }
          const ac = (w.actions || []).find(
            (a) => a.id === copyId && a.isRepeat
          );
          if (ac) {
            kind = "sub";
            seriesId = ac.seriesId;
            weekKey =
              ac.copyWeek || resolveWeekStart(ac.slotDate || ac.executionDate);
            rideAlong = !!ac.rideAlong;
          }
        });
        if (!kind || !seriesId || !weekKey) return map;

        const addSkip = (list, key) => [...new Set([...(list || []), key])];
        const out = {};
        Object.keys(map).forEach((wk) => {
          const w = map[wk];
          let commitments = w.commitments || [];
          let otherCommitments = w.otherCommitments || [];
          let actions = w.actions || [];
          if (kind === "goal") {
            commitments = commitments.map((c) =>
              !c.isRepeat &&
              (c.seriesId || c.id) === seriesId &&
              isRecurring(c.frequency)
                ? { ...c, recurSkips: addSkip(c.recurSkips, weekKey) }
                : c
            );
          } else if (kind === "other") {
            otherCommitments = otherCommitments.map((o) =>
              !o.isRepeat &&
              (o.seriesId || o.id) === seriesId &&
              isRecurring(o.frequency)
                ? { ...o, recurSkips: addSkip(o.recurSkips, weekKey) }
                : o
            );
          } else if (rideAlong) {
            // Ride-along sub: skip just this sub for this week on its parent goal.
            commitments = commitments.map((c) =>
              !c.isRepeat &&
              isRecurring(c.frequency) &&
              (c.recurSubIds || []).includes(seriesId)
                ? {
                    ...c,
                    recurSubSkips: addSkip(
                      c.recurSubSkips,
                      `${seriesId}|${weekKey}`
                    ),
                  }
                : c
            );
          } else {
            // Independent sub series: skip this week on the sub-action master.
            actions = actions.map((a) =>
              !a.isRepeat &&
              (a.seriesId || a.id) === seriesId &&
              isRecurring(a.frequency)
                ? { ...a, recurSkips: addSkip(a.recurSkips, weekKey) }
                : a
            );
          }
          out[wk] = { ...w, commitments, otherCommitments, actions };
        });
        return reconcileRecurrence(out, resolveWeekStart);
      };
      // Draft-only (see deleteSeriesMaster): applied to the working copy and
      // persisted on Save, so the edit window stays open.
      setWeeksData((prev) => apply(prev));
    },
    [resolveWeekStart]
  );

  // A week is locked (read-only) once its last day is in the past.
  const isWeekLocked = useCallback(
    (weekKey) =>
      isValidISO(weekKey) &&
      weekEndForStart(scheduleRef.current, weekKey) < todayISO(),
    []
  );

  useEffect(() => {
    setCarrySelectedSubIds([]);
    setCarrySelectedOtherIds([]);
    setCarryForwardChoice("yes");
  }, [selectedWeek]);

  // Discard unsaved edits when navigating away (changing tab or week) without
  // saving. Draft is reset to the last saved snapshot.
  useEffect(() => {
    setWeeksData(savedWeeksData);
    setEditingSection(null);
  }, [focusTab, selectedWeek, savedWeeksData]);

  return {
    summary: { ...powerPlannerSummary, periodLabel },
    focusTab,
    setFocusTab,

    // Date-anchored week model (weeks can be variable length now)
    startDate,
    setStartDate,
    hasStartDate,
    schedule,
    setWeekEnd,
    currentWeekStart,
    currentWeekEnd: weekEndForStart(schedule, currentWeekStart),
    selectedWeek,
    setSelectedWeek,
    selectedWeekEnd: weekEndForStart(schedule, selectedWeek),
    weekEndOf: (k) => weekEndForStart(schedule, k),
    nextWeekStartOf: (k) => nextWeekStart(schedule, k),
    prevWeekStartOf: (k) => prevWeekStart(schedule, k),
    recommendedEndOf: (k) => recommendedEndFor(k),
    weekLengthOf: (k) => weekLengthDays(schedule, k),
    isWeekLocked,
    savedWeekKeys,
    copyWeekPlan,
    deleteSeriesMaster,
    deleteRecurringCopy,

    commitments,
    commitmentIds,
    actions,
    analytics,
    addCommitment: commitmentHelpers.add,
    updateCommitment: commitmentHelpers.update,
    deleteCommitment: commitmentHelpers.remove,
    moveCommitment: commitmentHelpers.move,
    toggleCommitmentCollapse: commitmentHelpers.toggleCollapse,
    addAction: actionHelpers.add,
    updateAction: actionHelpers.update,
    deleteAction: actionHelpers.remove,
    moveAction: actionHelpers.move,
    toggleActionCollapse: actionHelpers.toggleCollapse,
    getActionsByParent,

    otherCommitments,
    otherCommitmentIds,
    savedCommitments,
    savedActions,
    savedOtherCommitments,
    savedStopDoingNow,
    addOtherCommitment: otherCommitmentHelpers.add,
    updateOtherCommitment: otherCommitmentHelpers.update,
    deleteOtherCommitment: otherCommitmentHelpers.remove,
    moveOtherCommitment: otherCommitmentHelpers.move,

    stopDoingNow,
    addStopDoingRow,
    updateStopDoingRow,
    removeStopDoingRow,

    watchoutReasons,
    savedWatchoutReasons,
    addWatchoutReason,
    updateWatchoutReason,
    removeWatchoutReason,

    lastWeekInsights,
    setLastWeekInsights,

    savePlannerData,
    pendingRepeatEdits,
    saveRepeatScope,
    editingSection,
    isDirty,
    beginEdit,
    cancelEdit,
    carryForwardOptions,
    carrySelectedSubIds,
    setCarrySelectedSubIds,
    carrySelectedOtherIds,
    setCarrySelectedOtherIds,
    carryForwardTag,
    setCarryForwardTag,
    carryForwardChoice,
    setCarryForwardChoice,
    getWeekDataByKey,
    getSavedWeekDataByKey,

    // Dropdown option lists (base + user-remembered "Other" names).
    categoryOptions,
    purposeOptions,
    assigneeOptions,
    // The user's remembered "Other" names, and a remover for managing them.
    customOptions,
    removeCustomOption,
  };
};

export default usePowerPlanner;
