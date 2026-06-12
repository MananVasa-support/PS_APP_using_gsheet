// Reasons Eliminator data layer (direct Google Sheets).
//
// The tool's pages read its three stores SYNCHRONOUSLY (in render/useMemo), so
// this service keeps an in-memory cache that is hydrated ONCE when the tool
// opens (the RE App gates rendering on it). Every write then updates the cache
// instantly (UI stays snappy) and fire-and-forgets the matching row upsert /
// delete — three tabs in the user's "Reasons Eliminator" spreadsheet:
//
//   sessions      — one row per assessment session (id = client-generated text,
//                   fits the Power Planner bridge ids 'pp:<weekStart>')
//   grip_tests    — one row per reason's LATEST grip score (keyed reason_id)
//   grip_history  — one row per completed grip-test run (append-only)
//
// Demo mode (no Google client id) never touches this file's network paths —
// the three feature services keep their original localStorage behavior there.

import { listRows, upsertRows, deleteRows, clearRows, getToken, onAuthChange, isConfigured } from '@/lib/gsApi';

export const reasonsCache = {
  sessions: [], // session objects (same shape the tool always used)
  grip: {}, // reasonId -> grip record
  runs: [], // grip-test run objects
  draft: null, // in-progress grip review (kept in memory only)
  hydrated: false,
};

const resetCache = () => {
  reasonsCache.sessions = [];
  reasonsCache.grip = {};
  reasonsCache.runs = [];
  reasonsCache.draft = null;
  reasonsCache.hydrated = false;
};

// ── row ↔ app-shape mappers ──────────────────────────────────────────────────
const rowToSession = (r) => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  status: r.status,
  ...(r.source ? { source: r.source } : {}),
  ...(r.week_start ? { weekStart: r.week_start } : {}),
  reasons: Array.isArray(r.reasons) ? r.reasons : [],
});

const rowToGrip = (r) => ({
  reasonId: r.reason_id,
  sessionId: r.session_id,
  seq: r.seq,
  text: r.reason_text,
  date: r.reason_date,
  score: r.score,
  status: r.status,
  updatedAt: r.updated_at,
});

const rowToRun = (r) => ({
  id: r.id,
  date: r.run_date,
  month: r.month || '',
  archived: !!r.archived,
  entries: Array.isArray(r.entries) ? r.entries : [],
});

// ── Hydration (once per login; single-flight) ────────────────────────────────
let hydration = null;

export function hydrateReasons() {
  if (!isConfigured) return Promise.resolve();
  if (!hydration) {
    hydration = (async () => {
      const [sessions, grips, runs] = await Promise.all([
        listRows('re_sessions'),
        listRows('re_grip_tests'),
        listRows('re_grip_history'),
      ]);
      reasonsCache.sessions = sessions.map(rowToSession);
      const grip = {};
      grips.forEach((r) => {
        grip[r.reason_id] = rowToGrip(r);
      });
      reasonsCache.grip = grip;
      reasonsCache.runs = runs.map(rowToRun);
      reasonsCache.hydrated = true;
    })().catch((e) => {
      hydration = null; // allow a retry on the next visit
      throw e;
    });
  }
  return hydration;
}

/** Hydrate only if not already done — used by the Power Planner review bridge,
 *  which can write reasons while the Reasons Eliminator was never opened. */
export const ensureReasonsHydrated = () =>
  reasonsCache.hydrated ? Promise.resolve() : hydrateReasons();

// A login as a DIFFERENT user must never see the previous user's cache.
if (isConfigured) {
  onAuthChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      resetCache();
      hydration = null;
    }
  });
}

// Fire-and-forget helper — every write below updates the cache synchronously
// (the caller already did) and pushes the row in the background.
const fireAndForget = (fn) => {
  if (!getToken()) return;
  Promise.resolve()
    .then(fn)
    .catch(() => {});
};

// ── Sessions ─────────────────────────────────────────────────────────────────
export function persistSessionRow(session) {
  if (!isConfigured || !session?.id) return;
  fireAndForget(() =>
    upsertRows('re_sessions', [
      {
        id: String(session.id),
        status: session.status || 'draft',
        source: session.source || null,
        week_start: session.weekStart || null,
        reasons: session.reasons || [],
        created_at: session.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
  );
}

export function deleteSessionRow(id) {
  if (!isConfigured || !id) return;
  fireAndForget(() => deleteRows('re_sessions', [String(id)]));
}

export function clearSessionRows() {
  if (!isConfigured) return;
  fireAndForget(() => clearRows('re_sessions'));
}

// ── Grip scores (latest per reason) ──────────────────────────────────────────
export function persistGripRow(rec) {
  if (!isConfigured || !rec?.reasonId) return;
  fireAndForget(() =>
    upsertRows('re_grip_tests', [
      {
        reason_id: String(rec.reasonId),
        session_id: rec.sessionId != null ? String(rec.sessionId) : null,
        seq: typeof rec.seq === 'number' ? rec.seq : null,
        reason_text: rec.text || null,
        reason_date: rec.date || null,
        score: typeof rec.score === 'number' ? rec.score : null,
        status: rec.status || null,
        updated_at: new Date().toISOString(),
      },
    ])
  );
}

export function deleteGripRow(reasonId) {
  if (!isConfigured || !reasonId) return;
  fireAndForget(() => deleteRows('re_grip_tests', [String(reasonId)]));
}

export function clearGripRows() {
  if (!isConfigured) return;
  fireAndForget(() => clearRows('re_grip_tests'));
}

// ── Grip-test runs (history) ─────────────────────────────────────────────────
export function persistRunRow(run) {
  if (!isConfigured || !run?.id) return;
  fireAndForget(() =>
    upsertRows('re_grip_history', [
      {
        id: String(run.id),
        run_date: run.date || new Date().toISOString(),
        month: run.month || null,
        archived: !!run.archived,
        entries: run.entries || [],
        updated_at: new Date().toISOString(),
      },
    ])
  );
}

export function deleteRunRow(id) {
  if (!isConfigured || !id) return;
  fireAndForget(() => deleteRows('re_grip_history', [String(id)]));
}

export function clearRunRows() {
  if (!isConfigured) return;
  fireAndForget(() => clearRows('re_grip_history'));
}
