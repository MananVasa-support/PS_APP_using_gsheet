export const PROGRESS_OPTIONS = Array.from({ length: 11 }, (_, i) => i / 10);

export const GAP_REASON_OPTIONS = ["Time", "Focus", "Clarity", "Reality"];

// The full "Lack of …" wording shown as the heading for each TFCR reason.
export const GAP_REASON_FULL_LABEL = {
  Time: "Lack of Time",
  Focus: "Lack of Focus",
  Clarity: "Lack of Clarity",
  Reality: "Lack of Reality",
};

// Sub-categories under each TFCR reason. Selecting a top reason reveals its
// sub-options; any number can be picked (and across multiple reasons). Stored on
// a row as `gapReason: { Time: ["Started Late", …], Clarity: [...] }` — a key
// present means that top reason is selected; its array holds the chosen subs.
export const GAP_REASON_SUBCATEGORIES = {
  Time: [
    "Started Late",
    "Inaccurate Time Estimate",
    "Don't have Sufficient Time",
    "Don't have Totality",
  ],
  Focus: [
    "Interrupted",
    "Distracted",
    "No Reminders",
    "Involved in Things other than What is Most Important",
  ],
  Clarity: [
    "Who will do it?",
    "Lack of Purpose or Motivation (Why?)",
    "Lack of Knowledge (How?)",
    "Lack of Skills / Competency / Talent",
    "Lack of Information",
  ],
  Reality: [
    "What does it look like if your Goal was alive?",
    "Do the Numbers Add Up?",
    "Does the Timeline Match?",
    "Is it Actionable?",
    "Are there External Factors at Play?",
  ],
};

// Category + Purpose pickers used on every Top Goal / sub-action / Other Thing.
// Both lists end in "Other", which swaps the dropdown for a free-text box (same
// pattern as Delegate To). A leading "" renders as the "Select" placeholder.
export const CATEGORY_LIST = [
  "Sales",
  "Collection",
  "Lead Generation",
  "Purchase",
  "Operations",
  "Service",
  "Logistics",
  "Systems",
  "Accounts",
  "Admin",
  "HR",
  "Production",
  "MIS",
  "Review",
  "Health",
  "Family",
  "Personal",
  "Breakdowns",
  "Management",
  "Sport",
  "Finances",
  "Factory",
  "Recruitment",
  "Learning",
  "Training",
  "Fire Fighting",
];

export const PURPOSE_LIST = [
  "Making a Difference",
  "Master of my Craft",
  "Excellence",
  "Growth",
  "Passion",
  "Joy",
  "Gratitude",
  "Contribution",
  "Adventure",
  "Love",
  "Care",
  "Leadership",
  "Recognition",
  "Fame",
  "Mastery",
  "Control",
  "Safety",
  "Security",
];

export const CATEGORY_OPTIONS = ["", ...CATEGORY_LIST, "Other"];
export const PURPOSE_OPTIONS = ["", ...PURPOSE_LIST, "Other"];

// Delegate To: only Self (default) and Other (type a name). Names typed under
// "Other" are remembered per-user and injected between these by the hook.
export const ASSIGNEE_OPTIONS = ["Self", "Other"];

export const DURATION_PRESETS = [
  "15 mins",
  "30 mins",
  "45 mins",
  "1 hour",
  "1.5 hours",
  "2 hours",
  "3 hours",
  "4 hours",
];

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const createEmptyCommitment = () => ({
  id: createId(),
  result: "",
  // Category cascades to this goal's sub-actions (as a default they can change);
  // Purpose is independent per row. "Other" stores free text in custom*.
  category: "",
  customCategory: "",
  purpose: "",
  customPurpose: "",
  targetDate: "",
  progress: 0,
  // True once the user has explicitly typed a % in Review (so an explicit 0 is
  // distinguishable from "not scored yet" and can trigger the TFCR row).
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  collapsed: false,
  // Recurrence (goal-level): how this goal repeats, when it ends, which
  // sub-actions ride along, dates the user removed, and series linkage.
  frequency: "once",
  recurEnd: { type: "never", count: 6, until: "" },
  recurCustom: { interval: 2, unit: "weeks" },
  // Selected weekdays (0=Sun … 6=Sat) for "Custom · every N weeks on these days".
  recurDays: [],
  recurSubIds: [],
  // Weeks the user removed (week-start ISO keys) and, for individual ride-along
  // sub-actions, `subId|weekStart` keys removed from a single week.
  recurSkips: [],
  recurSubSkips: [],
  seriesId: "",
  isRepeat: false,
  // Colour-coding key (see data/colorCoding.js).
  colorKey: "",
});

export const createEmptyAction = (parentCommitmentId = "") => ({
  id: createId(),
  parentCommitmentId,
  description: "",
  // Empty category here means "inherit the parent goal's category" (shown in the
  // dropdown but overridable); Purpose is independent and starts blank.
  category: "",
  customCategory: "",
  purpose: "",
  customPurpose: "",
  // Defaults to "Self" so a new sub-action is yours unless delegated; the
  // dropdown stays available to reassign.
  assignedTo: "Self",
  customDoneBy: "",
  executionDate: "",
  duration: "",
  actualDuration: "",
  startTime: "",
  endTime: "",
  progress: 0,
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  collapsed: false,
  // Recurrence (sub-action level) — a sub-action can repeat on its OWN schedule
  // (independent of its goal). Its copies land under a blank placeholder goal.
  frequency: "once",
  recurEnd: { type: "never", count: 6, until: "" },
  recurCustom: { interval: 2, unit: "weeks" },
  recurDays: [],
  recurSkips: [],
  // Set on generated copies. `rideAlong` copies follow a recurring GOAL and get
  // a blank, user-editable date; `slotDate` is the schedule date used only for
  // identity/dedup so the blank date never breaks reconciliation.
  seriesId: "",
  isRepeat: false,
  rideAlong: false,
  slotDate: "",
  // Colour-coding key (see data/colorCoding.js).
  colorKey: "",
  // When this action repeats into other weeks under its OWN schedule, should the
  // carrier goal use the SAME result name + details (false) or be a BLANK row
  // (true)? The user picks this in the repeat editor.
  carrierBlank: false,
});

export const createEmptyWatchoutReason = () => ({
  id: createId(),
  reason: "",
  powerWord: "",
  defeated: "",
});

export const createEmptyOtherCommitment = () => ({
  id: createId(),
  result: "",
  category: "",
  customCategory: "",
  purpose: "",
  customPurpose: "",
  targetDate: "",
  duration: "",
  actualDuration: "",
  startTime: "",
  endTime: "",
  // Defaults to "Self"; the dropdown stays available to reassign.
  assignedTo: "Self",
  customDoneBy: "",
  progress: 0,
  scored: false,
  gapReason: {},
  reasonNotDone: "",
  // Recurrence (item-level).
  frequency: "once",
  recurEnd: { type: "never", count: 6, until: "" },
  recurCustom: { interval: 2, unit: "weeks" },
  recurDays: [],
  recurSkips: [],
  seriesId: "",
  isRepeat: false,
  // Colour-coding key (see data/colorCoding.js).
  colorKey: "",
});
