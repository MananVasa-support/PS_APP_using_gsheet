// Reasons Eliminator data layer.
//
// Google Sheets storage was removed. In local mode the three Reasons
// Eliminator feature services keep their original localStorage behavior, so
// the functions here are inert and the in-memory cache is unused. The exported
// surface is kept so the RE App + the Power Planner bridge compile unchanged.

export const reasonsCache = {
  sessions: [],
  grip: {},
  runs: [],
  draft: null,
  hydrated: true, // local mode is always "ready" (no async hydration needed)
};

// RE App gates rendering on this — resolve immediately in local mode.
export function hydrateReasons() {
  return Promise.resolve();
}
export const ensureReasonsHydrated = () => Promise.resolve();

// Sessions / grip scores / runs — no-ops (the feature services use localStorage).
export function persistSessionRow() {}
export function deleteSessionRow() {}
export function clearSessionRows() {}
export function persistGripRow() {}
export function deleteGripRow() {}
export function clearGripRows() {}
export function persistRunRow() {}
export function deleteRunRow() {}
export function clearRunRows() {}
