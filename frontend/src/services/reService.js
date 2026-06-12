// Reasons Eliminator data layer (Supabase).
//
// The tool's pages read its three stores SYNCHRONOUSLY (in render/useMemo), so
// this service keeps an in-memory cache that is hydrated ONCE when the tool
// opens (the RE App gates rendering on it). Every write then updates the cache
// instantly (UI stays snappy) and fire-and-forgets the matching row upsert /
// delete to Supabase:
//
//   reasons_sessions      — one row per assessment session ((user_id, id) PK)
//   reasons_grip_tests    — one row per reason's LATEST grip score
//   reasons_grip_history  — one row per completed grip-test run
//
// Demo mode (no Supabase env) never touches this file's network paths — the
// three feature services keep their original localStorage behavior there.

import { isConfigured, supabase } from '@/lib/supabase';

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

// Always read the CURRENT session — never cache the uid (stale-session bug).
const myId = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
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
      const [s, g, h] = await Promise.all([
        supabase.from('reasons_sessions').select('*'),
        supabase.from('reasons_grip_tests').select('*'),
        supabase.from('reasons_grip_history').select('*'),
      ]);
      const err = s.error || g.error || h.error;
      if (err) throw err;
      reasonsCache.sessions = (s.data || []).map(rowToSession);
      const grip = {};
      (g.data || []).forEach((r) => {
        grip[r.reason_id] = rowToGrip(r);
      });
      reasonsCache.grip = grip;
      reasonsCache.runs = (h.data || []).map(rowToRun);
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
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      resetCache();
      hydration = null;
    }
  });
}

// ── Sessions ─────────────────────────────────────────────────────────────────
export function persistSessionRow(session) {
  if (!isConfigured || !session?.id) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_sessions').upsert(
      {
        user_id: uid,
        id: String(session.id),
        status: session.status || 'draft',
        source: session.source || null,
        week_start: session.weekStart || null,
        reasons: session.reasons || [],
        created_at: session.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,id' }
    );
  })().catch(() => {});
}

export function deleteSessionRow(id) {
  if (!isConfigured || !id) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_sessions').delete().eq('user_id', uid).eq('id', String(id));
  })().catch(() => {});
}

export function clearSessionRows() {
  if (!isConfigured) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_sessions').delete().eq('user_id', uid);
  })().catch(() => {});
}

// ── Grip scores (latest per reason) ──────────────────────────────────────────
export function persistGripRow(rec) {
  if (!isConfigured || !rec?.reasonId) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_grip_tests').upsert(
      {
        user_id: uid,
        reason_id: String(rec.reasonId),
        session_id: rec.sessionId != null ? String(rec.sessionId) : null,
        seq: typeof rec.seq === 'number' ? rec.seq : null,
        reason_text: rec.text || null,
        reason_date: rec.date || null,
        score: typeof rec.score === 'number' ? rec.score : null,
        status: rec.status || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,reason_id' }
    );
  })().catch(() => {});
}

export function deleteGripRow(reasonId) {
  if (!isConfigured || !reasonId) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase
      .from('reasons_grip_tests')
      .delete()
      .eq('user_id', uid)
      .eq('reason_id', String(reasonId));
  })().catch(() => {});
}

export function clearGripRows() {
  if (!isConfigured) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_grip_tests').delete().eq('user_id', uid);
  })().catch(() => {});
}

// ── Grip-test runs (history) ─────────────────────────────────────────────────
export function persistRunRow(run) {
  if (!isConfigured || !run?.id) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_grip_history').upsert(
      {
        user_id: uid,
        id: String(run.id),
        run_date: run.date || new Date().toISOString(),
        month: run.month || null,
        archived: !!run.archived,
        entries: run.entries || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,id' }
    );
  })().catch(() => {});
}

export function deleteRunRow(id) {
  if (!isConfigured || !id) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_grip_history').delete().eq('user_id', uid).eq('id', String(id));
  })().catch(() => {});
}

export function clearRunRows() {
  if (!isConfigured) return;
  (async () => {
    const uid = await myId();
    if (!uid) return;
    await supabase.from('reasons_grip_history').delete().eq('user_id', uid);
  })().catch(() => {});
}
