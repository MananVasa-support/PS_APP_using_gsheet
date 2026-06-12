// Power Planner → Reasons Eliminator bridge.
//
// In the Power Planner WEEKLY REVIEW, scoring a task below 100% (or marking it
// overtime) opens a "Reasons" row: the TFCR picker (Time / Focus / Clarity /
// Reality + subcategories, stored as `gapReason`) and a free-text "what got in
// the way" (`reasonNotDone`). Those ARE Reasons in the Reasons Eliminator
// sense — so when the user saves a Weekly Review, this bridge mirrors them into
// the Reasons Eliminator as one assessment session per planner week (marked
// "From Power Planner"). There the user assigns each one a Power Word — the
// sidebar's "Power Word Missing" badge counts them — and they join the Grip
// Test cycle like any hand-typed reason.
//
// Sync rules (safe to run on every review save):
//   - Session id is stable per week (`pp:<weekStart>`) → re-saving updates the
//     same session, never duplicates.
//   - Reason id is stable per planner row (`pp:<rowId>`) → a Power Word the
//     user already assigned is PRESERVED across re-saves; text/categories
//     refresh from the latest review.
//   - A row that no longer qualifies (re-scored to 100%, TFCR cleared) drops
//     its reason — unless that reason already earned a Power Word, in which
//     case it's kept (it is part of the user's record / grip history).
//   - Categories map Time→time …; subcategories map by position (both lists
//     are the same framework in the same order).

import reasonEliminatorService from '@/features/reason-eliminator/features/reason-eliminator/services/reasonEliminatorService.js';
import gripTestService from '@/features/reason-eliminator/features/reason-eliminator/services/gripTestService.js';
import {
  CATEGORY_DETAILS,
  SESSION_STATUS,
} from '@/features/reason-eliminator/features/reason-eliminator/constants.js';
import { GAP_REASON_SUBCATEGORIES } from '@/features/power-planner/data/powerPlannerConstants.js';

export const PP_SOURCE = 'power-planner';

// Power Planner TFCR key → Reasons Eliminator category id.
const CAT_ID = { Time: 'time', Focus: 'focus', Clarity: 'clarity', Reality: 'reality' };

// "Time:Started Late" → "time-1" — positional mapping between the two copies
// of the same subcategory framework.
const SUB_TO_DETAIL = {};
Object.entries(GAP_REASON_SUBCATEGORIES).forEach(([cat, labels]) => {
  labels.forEach((label, i) => {
    const detail = CATEGORY_DETAILS[CAT_ID[cat]]?.[i];
    if (detail) SUB_TO_DETAIL[`${cat}:${label}`] = detail.id;
  });
});

const taskName = (row) => (row.description || row.result || '').trim();

/**
 * Mirror one planner week's review reasons into the Reasons Eliminator.
 * Called after every successful "Save Weekly Review". Never throws — a bridge
 * hiccup must not break the planner save.
 */
export function syncWeekReviewToReasons(
  weekStart,
  { commitments = [], actions = [], otherCommitments = [] } = {}
) {
  try {
    if (!weekStart) return;
    const rows = [...commitments, ...actions, ...otherCommitments];

    // A row qualifies once at least one TFCR category is picked for it.
    const qualifying = [];
    rows.forEach((row) => {
      const gap = row?.gapReason || {};
      const cats = Object.keys(gap).filter((c) => CAT_ID[c]);
      if (cats.length === 0) return;
      const categories = cats.map((c) => CAT_ID[c]);
      const details = cats.flatMap((c) =>
        (Array.isArray(gap[c]) ? gap[c] : [])
          .map((label) => SUB_TO_DETAIL[`${c}:${label}`])
          .filter(Boolean)
      );
      const name = taskName(row);
      const text =
        (row.reasonNotDone || '').trim() ||
        (name ? `Couldn't complete: ${name}` : 'Task not completed');
      qualifying.push({ id: `pp:${row.id}`, text, categories, details, task: name });
    });

    const sessionId = `pp:${weekStart}`;
    const existing = reasonEliminatorService.getSession(sessionId);
    if (!existing && qualifying.length === 0) return; // nothing to do

    const prevById = {};
    (existing?.reasons || []).forEach((r) => {
      prevById[r.id] = r;
    });

    const now = new Date().toISOString();
    const reasons = qualifying.map((q, idx) => {
      const prev = prevById[q.id];
      return {
        id: q.id,
        index: idx,
        seq: idx + 1,
        text: q.text,
        categories: q.categories,
        details: q.details,
        powerWord: prev?.powerWord || '', // user-assigned Power Word survives re-saves
        archived: prev?.archived || false,
        createdAt: prev?.createdAt || now,
        source: PP_SOURCE,
        task: q.task,
      };
    });

    // Rows that no longer qualify: keep their reason only if it already has a
    // Power Word (it's part of the record); otherwise drop it + its grip data.
    const keepIds = new Set(reasons.map((r) => r.id));
    (existing?.reasons || []).forEach((r) => {
      if (keepIds.has(r.id)) return;
      if ((r.powerWord || '').trim()) {
        reasons.push({ ...r, index: reasons.length, seq: reasons.length + 1 });
      } else {
        gripTestService.removeForReason(r.id);
      }
    });

    if (reasons.length === 0) {
      reasonEliminatorService.deleteSession(sessionId);
      return;
    }

    reasonEliminatorService.upsertSession({
      id: sessionId,
      createdAt: existing?.createdAt || now,
      status: SESSION_STATUS.COMPLETED,
      source: PP_SOURCE,
      weekStart,
      reasons,
    });
  } catch {
    // Never let the bridge break a planner save.
  }
}
