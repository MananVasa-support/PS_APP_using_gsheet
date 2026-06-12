import { call, getToken, onAuthChange, isConfigured } from '@/lib/gsApi';
import { computeAnalytics } from '@/features/power-planner/utils/powerPlannerUtils';

/**
 * Power Planner — data layer (Google Sheets backend). THREE worksheets in the
 * user's "Power Planner" spreadsheet, one purpose each:
 *
 *   weeks     one row per week. `data` = the full PLAN json (commitments +
 *             frequency/duration/delegate/etc., actions, other things,
 *             to-stop, watch-outs, last-week insights). Keyed by week_start —
 *             editing a week UPDATES its row, never duplicates.
 *   reviews   one row per week — the auto-computed REVIEW scoreboard
 *             (completion %, productivity score, totals, insight blocks) in
 *             REAL columns so admin/consultant views can read them without
 *             parsing the plan json. Recomputed on every sync.
 *   settings  a single row (id='settings') — start_date, schedule (custom week
 *             boundaries), custom_options (remembered dropdown names),
 *             gcal_event_ids (Calendar de-dupe map).
 *
 * Carry-forward needs NO sheet: carried items exist as flagged rows
 * (isRepeat/repeatOf) inside the next week's plan.
 *
 * Sync model (UNCHANGED from the Supabase branch — Sheets allows roughly a
 * write per second sustained, so batching matters even more here): writes are
 * DEBOUNCED and DIFFED — only weeks whose content actually changed are
 * upserted; weeks that vanish from the map are deleted. Demo mode (no API
 * url): everything stays in localStorage exactly as before.
 */

const DEBOUNCE_MS = 900;
const TOOL = 'power-planner';

// ── Load everything for hydration ───────────────────────────────────────────
export async function loadPlanner() {
  if (!isConfigured) return null;
  // One request for both worksheets (cuts the Apps Script round-trips in half).
  const res = await call('/list', { tool: TOOL, sheets: ['weeks', 'settings'] });

  const weeks = {};
  (res?.weeks || []).forEach((row) => {
    weeks[row.week_start] = row.data || {};
  });
  // Seed the diff baseline so hydration doesn't immediately re-upload everything.
  lastSynced = snapshot(weeks);

  const s = (res?.settings || [])[0];
  return {
    weeks,
    startDate: s?.start_date || '',
    schedule: s?.schedule || null,
    customOptions: s?.custom_options || null,
    gcalEventIds: s?.gcal_event_ids || {},
  };
}

// ── Weeks sync (debounced + diffed) ─────────────────────────────────────────
const snapshot = (map) => {
  const out = {};
  Object.keys(map || {}).forEach((k) => {
    out[k] = JSON.stringify(map[k]);
  });
  return out;
};

let lastSynced = {}; // weekStart → serialized data (the last state we pushed)
let pendingMap = null;
let weekTimer = null;

export function queueWeeksSync(map) {
  if (!isConfigured) return;
  pendingMap = map;
  clearTimeout(weekTimer);
  weekTimer = setTimeout(flushWeeks, DEBOUNCE_MS);
}

async function flushWeeks() {
  const map = pendingMap;
  pendingMap = null;
  if (!map) return;
  if (!getToken()) return;

  const current = snapshot(map);
  const changed = Object.keys(current).filter((k) => current[k] !== lastSynced[k]);
  const removed = Object.keys(lastSynced).filter((k) => !(k in current));

  try {
    if (changed.length) {
      const now = new Date().toISOString();
      // Upsert the changed weeks (the PLAN)…
      await call('/upsert', {
        tool: TOOL,
        sheet: 'weeks',
        rows: changed.map((weekStart) => ({ week_start: weekStart, data: map[weekStart], updated_at: now })),
      });

      // …and refresh each one's REVIEW scoreboard (computed projection).
      await call('/upsert', {
        tool: TOOL,
        sheet: 'reviews',
        rows: changed.map((weekStart) => {
          const w = map[weekStart] || {};
          const a = computeAnalytics(w.commitments || [], w.actions || []);
          return {
            week_start: weekStart,
            completion_pct: a.completionPercentage || 0,
            productivity_score: a.productivityScore || 0,
            total_commitments: a.totalCommitments || 0,
            planned_hours: a.totalPlannedHours || 0,
            delegated_count: a.delegatedTasks || 0,
            insights: w.lastWeekInsights || {},
            updated_at: now,
          };
        }),
      });
    }

    if (removed.length) {
      await call('/delete', { tool: TOOL, sheet: 'weeks', ids: removed });
      await call('/delete', { tool: TOOL, sheet: 'reviews', ids: removed });
    }

    lastSynced = current;
  } catch {
    // Network/save hiccup: keep lastSynced as-is so the next edit retries the diff.
  }
}

// ── Settings sync (debounced, merged patches) ───────────────────────────────
let pendingSettings = null;
let settingsTimer = null;

export function queueSettingsSync(patch) {
  if (!isConfigured) return;
  pendingSettings = { ...(pendingSettings || {}), ...patch };
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(flushSettings, DEBOUNCE_MS);
}

async function flushSettings() {
  const patch = pendingSettings;
  pendingSettings = null;
  if (!patch) return;
  if (!getToken()) return;
  try {
    // The settings sheet is a singleton row keyed id='settings'; /upsert MERGES,
    // so partial patches (e.g. only gcal_event_ids) leave the rest untouched.
    await call('/upsert', {
      tool: TOOL,
      sheet: 'settings',
      rows: [{ id: 'settings', ...patch, updated_at: new Date().toISOString() }],
    });
  } catch {
    /* retried implicitly by the next settings change */
  }
}

// Push everything still sitting in the debounce queues RIGHT NOW. Called before
// logout — once the session is gone, a queued upsert would be rejected.
export async function flushPendingSyncs() {
  if (!isConfigured) return;
  clearTimeout(weekTimer);
  clearTimeout(settingsTimer);
  await Promise.all([flushWeeks(), flushSettings()]);
}

// A different login must not inherit the previous user's diff baseline.
if (isConfigured) {
  onAuthChange(() => {
    lastSynced = {};
    pendingMap = null;
    pendingSettings = null;
    clearTimeout(weekTimer);
    clearTimeout(settingsTimer);
  });
}

// ── Google Calendar event-id map (cross-device de-dupe) ─────────────────────
export async function loadGcalEventIds() {
  if (!isConfigured) return null;
  const rows = await call('/list', { tool: TOOL, sheet: 'settings' });
  return (rows || [])[0]?.gcal_event_ids || {};
}

export function saveGcalEventIds(map) {
  queueSettingsSync({ gcal_event_ids: map || {} });
}
