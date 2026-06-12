import { supabase, unwrapError, isConfigured } from '@/lib/supabase';
import { computeAnalytics } from '@/features/power-planner/utils/powerPlannerUtils';

/**
 * Power Planner — data layer. THREE tables, one purpose each:
 *
 *   power_planner_weeks    one row per user-week. `data` jsonb = the full PLAN
 *                          (commitments + frequency/duration/delegate/etc.,
 *                          actions, other things, to-stop, watch-outs,
 *                          last-week insights). unique(user_id, week_start) —
 *                          editing a week UPDATES its row, never duplicates.
 *   power_planner_reviews  one row per user-week — the auto-computed REVIEW
 *                          scoreboard (completion %, productivity score,
 *                          totals, insight blocks) in REAL columns so
 *                          admin/consultant/analytics can query without
 *                          parsing the plan jsonb. Recomputed on every sync.
 *   power_planner_settings one row per user — start_date, schedule (custom
 *                          week boundaries), custom_options (remembered
 *                          dropdown names), gcal_event_ids (Calendar de-dupe
 *                          map, so re-exports update events on any device).
 *
 * Carry-forward needs NO table: carried items exist as flagged rows
 * (isRepeat/repeatOf) inside the next week's plan.
 *
 * Sync model: the planner edits continuously, so writes are DEBOUNCED and
 * DIFFED — only weeks whose content actually changed are upserted; weeks that
 * vanish from the map (e.g. start-date re-anchor) are deleted. Demo mode
 * (no Supabase): everything stays in localStorage exactly as before.
 */

const DEBOUNCE_MS = 900;

// Always read the CURRENT session (never cache): if one user logs out and
// another logs in without a reload, a cached id would silently write nothing
// (RLS rejects) or worse, mis-tag queued syncs.
async function myId() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

// ── Load everything for hydration ───────────────────────────────────────────
export async function loadPlanner() {
  if (!isConfigured) return null;
  const [settingsRes, weeksRes] = await Promise.all([
    supabase.from('power_planner_settings').select('*').maybeSingle(),
    supabase.from('power_planner_weeks').select('week_start, data'),
  ]);
  if (settingsRes.error) throw unwrapError(settingsRes.error);
  if (weeksRes.error) throw unwrapError(weeksRes.error);

  const weeks = {};
  (weeksRes.data || []).forEach((row) => {
    weeks[row.week_start] = row.data || {};
  });
  // Seed the diff baseline so hydration doesn't immediately re-upload everything.
  lastSynced = snapshot(weeks);

  const s = settingsRes.data;
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
  const uid = await myId();
  if (!uid) return;

  const current = snapshot(map);
  const changed = Object.keys(current).filter((k) => current[k] !== lastSynced[k]);
  const removed = Object.keys(lastSynced).filter((k) => !(k in current));

  try {
    if (changed.length) {
      // Upsert the changed weeks (the PLAN)…
      const rows = changed.map((weekStart) => ({
        user_id: uid,
        week_start: weekStart,
        data: map[weekStart],
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('power_planner_weeks')
        .upsert(rows, { onConflict: 'user_id,week_start' });
      if (error) throw error;

      // …and refresh each one's REVIEW scoreboard (computed projection).
      const reviewRows = changed.map((weekStart) => {
        const w = map[weekStart] || {};
        const a = computeAnalytics(w.commitments || [], w.actions || []);
        return {
          user_id: uid,
          week_start: weekStart,
          completion_pct: a.completionPercentage || 0,
          productivity_score: a.productivityScore || 0,
          total_commitments: a.totalCommitments || 0,
          planned_hours: a.totalPlannedHours || 0,
          delegated_count: a.delegatedTasks || 0,
          insights: w.lastWeekInsights || {},
          updated_at: new Date().toISOString(),
        };
      });
      const { error: revErr } = await supabase
        .from('power_planner_reviews')
        .upsert(reviewRows, { onConflict: 'user_id,week_start' });
      if (revErr) throw revErr;
    }

    if (removed.length) {
      await supabase.from('power_planner_weeks').delete().eq('user_id', uid).in('week_start', removed);
      await supabase.from('power_planner_reviews').delete().eq('user_id', uid).in('week_start', removed);
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
  const uid = await myId();
  if (!uid) return;
  try {
    const { error } = await supabase
      .from('power_planner_settings')
      .upsert({ user_id: uid, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw error;
  } catch {
    /* retried implicitly by the next settings change */
  }
}

// Push everything still sitting in the debounce queues RIGHT NOW. Called before
// logout — once the session is gone, a queued upsert would fail RLS silently.
export async function flushPendingSyncs() {
  if (!isConfigured) return;
  clearTimeout(weekTimer);
  clearTimeout(settingsTimer);
  await Promise.all([flushWeeks(), flushSettings()]);
}

// ── Google Calendar event-id map (cross-device de-dupe) ─────────────────────
export async function loadGcalEventIds() {
  if (!isConfigured) return null;
  const { data, error } = await supabase
    .from('power_planner_settings')
    .select('gcal_event_ids')
    .maybeSingle();
  if (error) throw unwrapError(error);
  return data?.gcal_event_ids || {};
}

export function saveGcalEventIds(map) {
  queueSettingsSync({ gcal_event_ids: map || {} });
}
