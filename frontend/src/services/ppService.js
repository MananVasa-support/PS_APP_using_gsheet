import { listRows, upsertRows, deleteRows, getToken, onAuthChange, isConfigured } from '@/lib/gsApi';
import { computeAnalytics } from '@/features/power-planner/utils/powerPlannerUtils';

/**
 * Power Planner — data layer (direct Google Sheets). THREE tabs in the user's
 * "Power Planner" spreadsheet, one purpose each:
 *
 *   weeks     one row per week. `data` = the full PLAN json. Keyed by
 *             week_start — editing a week UPDATES its row, never duplicates.
 *   reviews   one row per week — the auto-computed REVIEW scoreboard
 *             (completion %, productivity score, totals, insight blocks) in
 *             REAL columns. Recomputed on every sync.
 *   settings  a single row (id='settings') — start_date, schedule,
 *             custom_options, gcal_event_ids (Calendar de-dupe map).
 *
 * Carry-forward needs NO tab: carried items exist as flagged rows
 * (isRepeat/repeatOf) inside the next week's plan.
 *
 * Sync model (unchanged): writes are DEBOUNCED and DIFFED — only weeks whose
 * content actually changed are upserted; weeks that vanish from the map are
 * deleted. The Sheets API allows ~60 writes/min/user, so batching matters.
 * Demo mode (no Google client id): everything stays in localStorage.
 */

const DEBOUNCE_MS = 900;

// ── Load everything for hydration ───────────────────────────────────────────
export async function loadPlanner() {
  if (!isConfigured) return null;
  const [weekRows, settingsRows] = await Promise.all([listRows('pp_weeks'), listRows('pp_settings')]);

  const weeks = {};
  weekRows.forEach((row) => {
    weeks[row.week_start] = row.data || {};
  });
  // Seed the diff baseline so hydration doesn't immediately re-upload everything.
  lastSynced = snapshot(weeks);

  const s = settingsRows[0];
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
      await upsertRows(
        'pp_weeks',
        changed.map((weekStart) => ({ week_start: weekStart, data: map[weekStart], updated_at: now }))
      );

      // …and refresh each one's REVIEW scoreboard (computed projection).
      await upsertRows(
        'pp_reviews',
        changed.map((weekStart) => {
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
        })
      );
    }

    if (removed.length) {
      await deleteRows('pp_weeks', removed);
      await deleteRows('pp_reviews', removed);
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
    // Singleton row keyed id='settings'; upsertRows MERGES, so partial patches
    // (e.g. only gcal_event_ids) leave the rest untouched.
    await upsertRows('pp_settings', [{ id: 'settings', ...patch, updated_at: new Date().toISOString() }]);
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
  const rows = await listRows('pp_settings');
  return rows[0]?.gcal_event_ids || {};
}

export function saveGcalEventIds(map) {
  queueSettingsSync({ gcal_event_ids: map || {} });
}
