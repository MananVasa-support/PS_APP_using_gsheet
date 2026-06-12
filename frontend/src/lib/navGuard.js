// Global navigation guard — the "save your changes?" net for the whole app.
//
// A tool that can hold unsaved edits (Power Planner table, Time Auditor
// assessment, Meeting questionnaire) registers a guard while it is mounted.
// Every shell-level way OUT of a tool (the PS logo, the Back/HubLink button,
// the navbar menu, logout, the Time Auditor sidebar) runs its navigation
// through guardNav() — so the tool gets the chance to pop its own
// Save / Discard / Stay dialog first instead of silently losing the edits.
//
// The guard receives the navigation as a `proceed` callback: call it to let
// the user leave, or hold it behind a confirmation dialog.

let activeGuard = null;

/**
 * Register the active guard. Only one tool is mounted at a time, so a single
 * slot is enough. Returns an unregister function (use it as the useEffect
 * cleanup) that only clears the slot if it still holds THIS guard — protects
 * against mount/unmount ordering during route changes.
 */
export const setNavGuard = (guard) => {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
};

/** Run `proceed` now, or hand it to the active guard to confirm first. */
export const guardNav = (proceed) => {
  if (activeGuard) activeGuard(proceed);
  else proceed();
};
