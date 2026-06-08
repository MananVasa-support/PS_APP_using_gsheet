// Periodic Grip Test history. Every completed Grip Test review is appended as a
// brand-new, dated record here — earlier records are NEVER overwritten. An
// in-progress "draft" is also kept so a review can be left and resumed.
//
// This lives in its OWN localStorage key, completely independent of the
// per-reason latest-score store (gripTestService). Existing grip data and its
// structure are left untouched.
import { gripStatus } from './gripTestService.js';

const KEY = 'altus.reasonEliminator.gripHistory.v1';

function read() {
  if (typeof window === 'undefined') return { runs: [], draft: null };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY));
    if (!parsed || typeof parsed !== 'object') return { runs: [], draft: null };
    return {
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      draft: parsed.draft || null,
    };
  } catch {
    return { runs: [], draft: null };
  }
}

function write(state) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `grip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const gripHistoryService = {
  // All completed runs, newest first.
  getRuns() {
    return read()
      .runs.slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Append a NEW completed run (its own id + date). Never overwrites earlier
  // runs, so the full Grip Test history is preserved over time. `month`
  // ('YYYY-MM') records which calendar month's reasons this run covered, so the
  // Grip Test knows a month is done and can default to the next one.
  addRun(entries, month) {
    const state = read();
    const run = {
      id: genId(),
      date: new Date().toISOString(),
      month: month || '',
      entries: (entries || []).map((e) => ({
        reasonId: e.reasonId,
        seq: e.seq,
        text: e.text,
        score: e.score,
        status: gripStatus(e.score),
      })),
    };
    state.runs.push(run);
    write(state);
    return run;
  },

  // Replace the entries of an existing run (same id/date/month). Used when the
  // user re-ends a Grip Test after editing — it updates the same run rather than
  // appending a duplicate.
  updateRun(runId, entries) {
    const state = read();
    let updated = null;
    const runs = state.runs.map((run) => {
      if (run.id !== runId) return run;
      updated = {
        ...run,
        entries: (entries || []).map((e) => ({
          reasonId: e.reasonId,
          seq: e.seq,
          text: e.text,
          score: e.score,
          status: gripStatus(e.score),
        })),
      };
      return updated;
    });
    write({ ...state, runs });
    return updated;
  },

  // Update a single reason's score within a saved run (used to edit a grip
  // score from the Grip Test Complete screen). Status is recomputed; all other
  // runs and entries are left untouched.
  updateEntryScore(runId, reasonId, score) {
    const state = read();
    const runs = state.runs.map((run) =>
      run.id === runId
        ? {
            ...run,
            entries: (run.entries || []).map((e) =>
              e.reasonId === reasonId
                ? { ...e, score, status: gripStatus(score) }
                : e
            ),
          }
        : run
    );
    write({ ...state, runs });
  },

  // Remove a single completed run by id. Other runs and the draft are untouched.
  deleteRun(runId) {
    const state = read();
    write({ ...state, runs: state.runs.filter((r) => r.id !== runId) });
  },

  // Remove a single reason entry from within a run (used by the per-reason
  // Delete on the Grip Test detail screen). Other entries and runs are left
  // untouched; the run itself stays even if it ends up with no entries.
  deleteEntry(runId, reasonId) {
    const state = read();
    const runs = state.runs.map((run) =>
      run.id === runId
        ? {
            ...run,
            entries: (run.entries || []).filter(
              (e) => e.reasonId !== reasonId
            ),
          }
        : run
    );
    write({ ...state, runs });
  },

  // Archive / unarchive a single run (additive flag). Existing runs without the
  // flag count as active. Scores and every other field are left untouched.
  setArchived(runId, archived) {
    const state = read();
    const runs = state.runs.map((run) =>
      run.id === runId ? { ...run, archived: !!archived } : run
    );
    write({ ...state, runs });
  },

  // Update a single entry's reason text within a run (used by the Grip Test
  // Complete editor). Other entries/runs are untouched.
  updateEntryText(runId, reasonId, text) {
    const state = read();
    const runs = state.runs.map((run) =>
      run.id === runId
        ? {
            ...run,
            entries: (run.entries || []).map((e) =>
              e.reasonId === reasonId ? { ...e, text } : e
            ),
          }
        : run
    );
    write({ ...state, runs });
  },

  // In-progress review (scores entered so far + the selected range), so leaving
  // and returning resumes from where the user left off.
  getDraft() {
    return read().draft;
  },

  setDraft(draft) {
    const state = read();
    state.draft = draft;
    write(state);
  },

  clearDraft() {
    const state = read();
    state.draft = null;
    write(state);
  },

  // Wipe every completed run and any in-progress draft — used by the global
  // "Reset All Data" action on the Home screen.
  clearAll() {
    write({ runs: [], draft: null });
  },
};

export default gripHistoryService;
