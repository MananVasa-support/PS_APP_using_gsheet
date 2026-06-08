import {
  GAP_REASON_OPTIONS,
  GAP_REASON_SUBCATEGORIES,
} from "../data/powerPlannerConstants";

// TFCR / gap reasons are stored as an object: a present key (Time/Focus/Clarity/
// Reality) means that top reason is selected; its array holds the chosen
// sub-categories. This coerces any historical shape (old array of top reasons, a
// bare string, or a partly-malformed object) into that canonical form, dropping
// anything not in the known lists.
export const normalizeGapReason = (value) => {
  const out = {};
  const addTop = (key) => {
    const k = String(key || "").trim();
    if (GAP_REASON_OPTIONS.includes(k) && !out[k]) out[k] = [];
  };
  if (Array.isArray(value)) {
    value.forEach(addTop);
  } else if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      const k = String(key || "").trim();
      if (!GAP_REASON_OPTIONS.includes(k)) return;
      const raw = value[key];
      const subs = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const valid = GAP_REASON_SUBCATEGORIES[k] || [];
      out[k] = [
        ...new Set(subs.map((s) => String(s).trim()).filter((s) => valid.includes(s))),
      ];
    });
  } else if (typeof value === "string") {
    addTop(value);
  }
  return out;
};

// Top reasons selected on a row (e.g. ["Time", "Clarity"]).
export const gapReasonTops = (value) => Object.keys(normalizeGapReason(value));

// Flattened {top, sub} pairs for every chosen sub-category.
export const gapReasonSubPairs = (value) =>
  Object.entries(normalizeGapReason(value)).flatMap(([top, subs]) =>
    subs.map((sub) => ({ top, sub }))
  );

export const gapReasonHasAny = (value) => gapReasonTops(value).length > 0;

export const indexToCommitmentId = (index) => {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
};

export const formatProgressPercent = (progress) => `${Math.round(progress * 100)}%`;

export const progressTone = (progress) => {
  if (progress >= 1) return "complete";
  if (progress >= 0.7) return "high";
  if (progress >= 0.4) return "mid";
  return "low";
};

export const computeParentProgress = (subActions = []) => {
  if (!subActions || subActions.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  subActions.forEach((sub) => {
    const hours = parseDurationToHours(sub?.duration);
    const weight = hours > 0 ? hours : 1;
    const progress = Math.max(0, Math.min(1, Number(sub?.progress) || 0));
    weightedSum += progress * weight;
    totalWeight += weight;
  });
  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
};

export const parseDurationToHours = (duration) => {
  if (!duration) return 0;
  const value = String(duration).toLowerCase().trim();
  let total = 0;
  let matched = false;
  const hourMatch = value.match(/([\d.]+)\s*h/);
  if (hourMatch) {
    total += parseFloat(hourMatch[1]);
    matched = true;
  }
  const minMatch = value.match(/([\d.]+)\s*m/);
  if (minMatch) {
    total += parseFloat(minMatch[1]) / 60;
    matched = true;
  }
  if (matched) return total;
  const numeric = parseFloat(value);
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const addDurationToStartTime = (startTime, duration) => {
  if (!startTime || !duration) return "";
  const parts = startTime.split(":");
  if (parts.length < 2) return "";

  const startHour = Number(parts[0]);
  const startMinute = Number(parts[1]);
  if (Number.isNaN(startHour) || Number.isNaN(startMinute)) return "";

  const totalMinutesToAdd = Math.round(parseDurationToHours(duration) * 60);
  if (!totalMinutesToAdd) return "";

  const absoluteStartMinutes = startHour * 60 + startMinute;
  const absoluteEndMinutes = (absoluteStartMinutes + totalMinutesToAdd) % (24 * 60);
  const endHour = Math.floor(absoluteEndMinutes / 60);
  const endMinute = absoluteEndMinutes % 60;

  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
};

export const computeAnalytics = (commitments, actions) => {
  const totalCommitments = commitments.length;
  const totalPlannedHours = actions.reduce(
    (sum, action) => sum + parseDurationToHours(action.duration),
    0
  );

  const commitmentProgress =
    commitments.length === 0
      ? 0
      : commitments.reduce((sum, row) => {
          const subs = actions.filter((a) => a.parentCommitmentId === row.id);
          return sum + computeParentProgress(subs);
        }, 0) / commitments.length;

  const actionProgress =
    actions.length === 0
      ? 0
      : actions.reduce((sum, row) => sum + row.progress, 0) / actions.length;

  const completionPercentage = Math.round(
    ((commitmentProgress + actionProgress) / 2) * 100
  );

  const activeActionItems = actions.filter((row) => row.progress < 1).length;
  const delegatedTasks = actions.filter(
    (row) => row.assignedTo && row.assignedTo !== "Self"
  ).length;

  const productivityScore = Math.round(
    completionPercentage * 0.6 +
      (totalCommitments > 0 ? 20 : 0) +
      (delegatedTasks > 0 ? 10 : 0) +
      Math.min(totalPlannedHours, 10)
  );

  return {
    totalCommitments,
    totalPlannedHours: Number(totalPlannedHours.toFixed(1)),
    completionPercentage,
    activeActionItems,
    delegatedTasks,
    productivityScore: Math.min(productivityScore, 100),
    nextAction: pickNextAction(commitments, actions),
    chartData: [
      { name: "Commitments", value: Math.round(commitmentProgress * 100) },
      { name: "Actions", value: Math.round(actionProgress * 100) },
      { name: "Execution", value: completionPercentage },
    ],
  };
};

export const pickNextAction = (commitments, actions) => {
  const remaining = actions.filter((a) => a.progress < 1);
  if (remaining.length === 0) return null;

  const score = (a) => {
    const date = a.executionDate?.trim() || "";
    const start = a.startTime?.trim() || "";
    // best-effort: prioritize dated actions first, then those with a start time
    const dateRank = date ? 0 : 1;
    const timeRank = start ? 0 : 1;
    return `${dateRank}-${date}-${timeRank}-${start}`;
  };

  const sorted = [...remaining].sort((a, b) => score(a).localeCompare(score(b)));
  const next = sorted[0];
  const parent = commitments.find((c) => c.id === next.parentCommitmentId);

  return {
    parentResult: parent?.result || "",
    description: next.description || "",
    executionDate: next.executionDate || "",
    duration: next.duration || "",
    startTime: next.startTime || "",
    endTime: next.endTime || "",
    assignedTo: next.assignedTo || "Self",
  };
};

const isSelf = (row) => {
  // Treat a blank/unset assignee as "yours" too, so the Next Task card appears
  // right after saving Top Goals without forcing the user to pick "Self" first.
  const a = String(row?.assignedTo || "").trim().toLowerCase();
  return a === "" || a === "self" || a === "select";
};

const buildStartDateTime = (date, time) => {
  if (!date || !time || typeof date !== "string" || typeof time !== "string") return null;
  // Expect "YYYY-MM-DD" + "HH:MM"
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};

export const pickNextSelfTask = (
  commitments = [],
  actions = [],
  now = new Date()
) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dated = [];
  const undated = [];

  actions.forEach((a) => {
    if (!isSelf(a)) return;
    if ((a.progress || 0) >= 1) return;
    const parent = commitments.find((c) => c.id === a.parentCommitmentId);
    // Fall back to parent's targetDate if the sub-action's date is empty
    const date =
      (a.executionDate && a.executionDate.trim()) ||
      (a.targetDate && a.targetDate.trim()) ||
      parent?.targetDate ||
      "";

    const rawTime = (a.startTime && a.startTime.trim()) || "";
    const base = {
      kind: "action",
      id: a.id,
      parentLabel: parent?.result || "",
      parentSource: "Top Goal",
      description: a.description || "",
      executionDate: date,
      startTime: a.startTime,
      endTime: a.endTime,
      duration: a.duration,
      hasTime: !!rawTime,
    };

    // No date yet — still surface it so something shows right after saving.
    if (!date) {
      undated.push({ ...base, startAt: null });
      return;
    }

    const startAt = buildStartDateTime(date, rawTime || "00:00");
    if (!startAt) {
      undated.push({ ...base, startAt: null });
      return;
    }
    const taskDateOnly = new Date(
      startAt.getFullYear(),
      startAt.getMonth(),
      startAt.getDate()
    );
    // Skip only strictly past dates; today stays eligible all day.
    if (taskDateOnly < today) return;
    dated.push({ ...base, startAt });
  });

  dated.sort((a, b) => a.startAt - b.startAt);
  // Prefer the soonest dated task; otherwise fall back to any undated task.
  return dated[0] || undated[0] || null;
};

export const insertAtIndex = (list, index, item) => [
  ...list.slice(0, index),
  item,
  ...list.slice(index),
];

export const getOwnerKey = (row) => {
  if (!row) return "";
  const assigned = String(row.assignedTo || "").trim().toLowerCase();
  if (assigned === "" || assigned === "select") return "";
  if (assigned === "other") {
    const name = String(row.customDoneBy || "").trim().toLowerCase();
    return name ? `other:${name}` : "";
  }
  return `assignee:${assigned}`;
};

const timeToMinutes = (t) => {
  if (!t || typeof t !== "string") return null;
  const [hh, mm] = t.split(":").map((s) => Number(s));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

const rowDate = (row) =>
  (row?.executionDate || row?.targetDate || "").trim();

const rowEndMinutes = (row) => {
  const explicit = timeToMinutes(row?.endTime);
  if (explicit !== null) return explicit;
  // Fallback: derive from startTime + duration if endTime isn't filled in yet
  const start = timeToMinutes(row?.startTime);
  if (start === null) return null;
  const hours = parseDurationToHours(row?.duration);
  if (!hours || hours <= 0) return null;
  return start + Math.round(hours * 60);
};

export const rowsHaveTimeOverlap = (a, b) => {
  if (!a || !b) return false;
  const dateA = rowDate(a);
  const dateB = rowDate(b);
  if (!dateA || !dateB) return false;
  if (dateA !== dateB) return false;
  const aStart = timeToMinutes(a.startTime);
  const bStart = timeToMinutes(b.startTime);
  if (aStart === null || bStart === null) return false;
  const aEnd = rowEndMinutes(a);
  const bEnd = rowEndMinutes(b);
  if (aEnd === null || bEnd === null) return false;
  return aStart < bEnd && bStart < aEnd;
};

export const computeScheduleConflicts = (rows = []) => {
  const conflicts = new Set();
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      const ownerA = getOwnerKey(a);
      const ownerB = getOwnerKey(b);
      if (!ownerA || !ownerB || ownerA !== ownerB) continue;
      if (rowsHaveTimeOverlap(a, b)) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
};

export const moveItem = (list, fromIndex, toIndex) => {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};
