/**
 * Power Planner — data layer.
 *
 * Google Sheets storage was removed. usePowerPlanner persists the planner to
 * browser localStorage itself, so the sync functions here are now inert. The
 * exported surface (load/queue/flush + gcal map) is kept so the hook and the
 * Calendar export compile unchanged.
 */

// Local mode → the hook hydrates from localStorage; nothing to load here.
export async function loadPlanner() {
  return null;
}

// Debounced sync queues — no-ops in local mode.
export function queueWeeksSync() {}
export function queueSettingsSync() {}
export async function flushPendingSyncs() {}

// Google Calendar event-id map — kept locally by the Calendar export itself.
export async function loadGcalEventIds() {
  return null;
}
export function saveGcalEventIds() {}
