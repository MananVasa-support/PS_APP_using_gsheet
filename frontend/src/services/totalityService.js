import { listRows, upsertRows, deleteRows, isConfigured } from '@/lib/gsApi';
import {
  weekStartForDate,
  nextWeekStart,
  weekEndForStart,
  scheduleFromStart,
  isValidSchedule,
} from '@/features/power-planner/utils/weekSchedule';
import { todayISO } from '@/features/power-planner/utils/weekDates';
import { createEmptyCommitment } from '@/features/power-planner/data/powerPlannerConstants';

/**
 * Totality (Pre PS) data layer.
 *
 *   • Tasks  → `totality_tasks` (one row per task; status open|done).
 *   • Subject / Doer auto-add option lists → `totality_meta` singleton row.
 *   • "Move to Power Planner" injects the task as a single NON-recurring goal
 *     into the chosen week's `pp_weeks` plan (read-modify-write), so it shows
 *     up in Power Planner without disturbing its recurrence engine.
 *
 * When the Sheets backend isn't configured (no VITE_API_BASE_URL) everything
 * falls back to localStorage so the form still works in demo mode.
 */

const TASKS_KEY = 'ta_totality_tasks';
const OPTIONS_KEY = 'ta_totality_options';

export const FREQUENCY_OPTIONS = [
  'One Time',
  'Daily',
  'Weekly',
  'Monthly',
  'Twice a Week',
  'Thrice a Week',
  'Quarterly',
  'Half Yearly',
  'Annually',
];

// ── localStorage helpers (demo fallback) ─────────────────────────────────────
function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

// ── Tasks ────────────────────────────────────────────────────────────────────
export async function listTasks() {
  if (!isConfigured) {
    return readLocal(TASKS_KEY, []);
  }
  const rows = await listRows('totality_tasks');
  // Newest first.
  return [...rows].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

/** Insert or update a task. Pass a full task object; `id`/timestamps are filled. */
export async function saveTask(task) {
  const now = new Date().toISOString();
  const row = {
    id: task.id || `tot_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    subject: task.subject || '',
    thing_to_get_done: task.thingToGetDone || '',
    frequency: task.frequency || '',
    priority: task.priority || '',
    target_date: task.targetDate || '',
    doer: task.doer || '',
    notes: task.notes || '',
    schedule: task.schedule || '',
    moved_to_week: task.movedToWeek || '',
    status: task.status || 'open',
    created_at: task.created_at || now,
    updated_at: now,
  };

  if (!isConfigured) {
    const list = readLocal(TASKS_KEY, []);
    const idx = list.findIndex((t) => t.id === row.id);
    if (idx >= 0) list[idx] = row;
    else list.unshift(row);
    writeLocal(TASKS_KEY, list.slice(0, 500));
    return row;
  }

  await upsertRows('totality_tasks', [row]);
  return row;
}

/** Flip a task between 'open' and 'done'. */
export async function setTaskStatus(task, status) {
  return saveTask({
    ...fromRow(task),
    status,
  });
}

export async function deleteTask(id) {
  if (!isConfigured) {
    writeLocal(TASKS_KEY, readLocal(TASKS_KEY, []).filter((t) => t.id !== id));
    return;
  }
  await deleteRows('totality_tasks', [id]);
}

// Normalize a stored row (snake_case) back to the form's camelCase shape.
export function fromRow(row) {
  return {
    id: row.id,
    subject: row.subject || '',
    thingToGetDone: row.thing_to_get_done || '',
    frequency: row.frequency || '',
    priority: row.priority || '',
    targetDate: row.target_date || '',
    doer: row.doer || '',
    notes: row.notes || '',
    schedule: row.schedule || '',
    movedToWeek: row.moved_to_week || '',
    status: row.status || 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Subject / Doer auto-add option lists ─────────────────────────────────────
export async function getOptions() {
  if (!isConfigured) {
    return readLocal(OPTIONS_KEY, { subjects: [], doers: [] });
  }
  const rows = await listRows('totality_meta');
  const o = rows.find((r) => r.id === 'options') || rows[0] || {};
  return { subjects: o.subjects || [], doers: o.doers || [] };
}

/**
 * Add a value to the 'subjects' or 'doers' list if it isn't already there
 * (case-insensitive). Returns the updated option lists.
 */
export async function addOption(kind, value, current) {
  const key = kind === 'doers' ? 'doers' : 'subjects';
  const v = String(value || '').trim();
  const opts = current || (await getOptions());
  if (!v) return opts;
  const exists = opts[key].some((x) => x.toLowerCase() === v.toLowerCase());
  if (exists) return opts;

  const next = { ...opts, [key]: [...opts[key], v].sort((a, b) => a.localeCompare(b)) };

  if (!isConfigured) {
    writeLocal(OPTIONS_KEY, next);
    return next;
  }
  await upsertRows('totality_meta', [
    { id: 'options', subjects: next.subjects, doers: next.doers, updated_at: new Date().toISOString() },
  ]);
  return next;
}

// ── Power Planner week model ─────────────────────────────────────────────────
async function loadSchedule() {
  if (!isConfigured) return scheduleFromStart(todayISO());
  try {
    const rows = await listRows('pp_settings');
    const s = rows[0]?.schedule;
    return isValidSchedule(s) ? s : scheduleFromStart(todayISO());
  } catch {
    return scheduleFromStart(todayISO());
  }
}

const fmtRange = (startISO, endISO) => {
  const opt = { month: 'short', day: 'numeric' };
  try {
    const s = new Date(`${startISO}T00:00:00`).toLocaleDateString(undefined, opt);
    const e = new Date(`${endISO}T00:00:00`).toLocaleDateString(undefined, opt);
    return `${s} – ${e}`;
  } catch {
    return `${startISO} – ${endISO}`;
  }
};

/**
 * The next 4 selectable Power-Planner weeks, starting with the week that
 * contains today. Each: { key: weekStartISO, label: "Week 1 · Jun 16 – 22" }.
 */
export async function getUpcomingWeeks() {
  const schedule = await loadSchedule();
  const out = [];
  let start = weekStartForDate(schedule, todayISO());
  for (let i = 0; i < 4; i += 1) {
    const end = weekEndForStart(schedule, start);
    out.push({ key: start, label: `Week ${i + 1} · ${fmtRange(start, end)}` });
    start = nextWeekStart(schedule, start);
  }
  return out;
}

const emptyWeek = () => ({
  commitments: [],
  actions: [],
  otherCommitments: [],
  stopDoingNow: [],
  watchoutReasons: [],
  lastWeekInsights: {},
});

/**
 * Inject `task` into the Power-Planner week starting at `weekStart` as one
 * non-recurring goal (commitment). Read-modify-write on `pp_weeks` so an
 * already-saved week keeps its existing rows. Returns silently in demo mode
 * (no backend) — the task is still saved + tagged with the week.
 */
export async function injectIntoPowerPlanner(weekStart, task) {
  if (!isConfigured || !weekStart) return;

  const rows = await listRows('pp_weeks');
  const existing = rows.find((r) => r.week_start === weekStart);
  const week = { ...emptyWeek(), ...(existing?.data || {}) };

  const priorityTag = task.priority ? `(${task.priority}) ` : '';
  const detail = task.thingToGetDone ? ` — ${task.thingToGetDone}` : '';

  const goal = {
    ...createEmptyCommitment(),
    result: `${priorityTag}${task.subject || 'Task'}${detail}`.slice(0, 500),
    targetDate: task.targetDate || '',
    frequency: 'once',
    // Full source data carried on the row (PP preserves unknown fields) so the
    // task's Doer / Notes / Frequency are never lost by the injection.
    fromTotality: true,
    totality: {
      subject: task.subject || '',
      thingToGetDone: task.thingToGetDone || '',
      doer: task.doer || '',
      notes: task.notes || '',
      frequency: task.frequency || '',
      priority: task.priority || '',
      schedule: task.schedule || '',
    },
  };

  week.commitments = [...(week.commitments || []), goal];

  await upsertRows('pp_weeks', [
    { week_start: weekStart, data: week, updated_at: new Date().toISOString() },
  ]);
}
