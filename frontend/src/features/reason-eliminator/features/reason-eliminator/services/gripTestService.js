// Isolated storage for the Grip Test. Kept in its own store so it is
// completely independent of the assessment session store — adding grip data
// never touches existing reasons, categories, power words, or resume state.
// With Supabase connected each reason's LATEST grip score is one row in
// `reasons_grip_tests` (real score/status columns, per-user via RLS): reads
// come from the in-memory cache hydrated when the tool opens, writes update
// the cache + fire-and-forget the row. Demo mode keeps localStorage.
import { isConfigured } from '@/lib/supabase';
import {
  reasonsCache,
  persistGripRow,
  deleteGripRow,
  clearGripRows,
} from '@/services/reService';

const GRIP_STORAGE_KEY = 'altus.reasonEliminator.gripTest.v1';

// Score (0-5) -> grip status label.
export function gripStatus(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return '';
  if (n <= 0) return 'No Grip';
  if (n <= 1) return 'Very Low Grip';
  if (n <= 2) return 'Low Grip';
  if (n <= 3) return 'Moderate Grip';
  if (n <= 4) return 'High Grip';
  return 'Too Much Grip';
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readAll() {
  if (isConfigured) return reasonsCache.grip;
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(GRIP_STORAGE_KEY);
  return raw ? safeParse(raw) : {};
}

function writeAll(map) {
  if (isConfigured) {
    reasonsCache.grip = map;
    return;
  }
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(GRIP_STORAGE_KEY, JSON.stringify(map));
}

export const gripTestService = {
  // Grip record for a single reason, or null if not scored yet.
  getForReason(reasonId) {
    return readAll()[reasonId] || null;
  },

  // Every saved grip record (across all sessions), as a flat array. Read-only —
  // used to show previously completed sections without touching stored data.
  getAllRecords() {
    return Object.values(readAll()).filter(Boolean);
  },

  // Save (or update) the grip record for one reason.
  saveRecord({ reasonId, sessionId, seq, text, score, date }) {
    const all = { ...readAll() };
    all[reasonId] = {
      reasonId,
      sessionId,
      seq,
      text,
      date,
      score,
      status: gripStatus(score),
      updatedAt: new Date().toISOString(),
    };
    writeAll(all);
    persistGripRow(all[reasonId]); // no-op in demo mode
    return all[reasonId];
  },

  // Remove the saved grip score for a single reason — used when that reason is
  // deleted, so no orphaned grip data is left behind. Additive: it only removes
  // the one reason's record and leaves every other untouched.
  removeForReason(reasonId) {
    const all = { ...readAll() };
    if (all[reasonId]) {
      delete all[reasonId];
      writeAll(all);
      deleteGripRow(reasonId); // no-op in demo mode
    }
  },

  // Remove every saved per-reason grip score — used by the global "Reset All
  // Data" action on the Home screen.
  clearAll() {
    writeAll({});
    clearGripRows(); // no-op in demo mode
  },
};

export default gripTestService;
