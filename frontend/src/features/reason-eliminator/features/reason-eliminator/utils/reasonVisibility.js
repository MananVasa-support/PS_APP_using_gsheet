import gripTestService from '../services/gripTestService.js';
import reasonEliminatorService from '../services/reasonEliminatorService.js';

// A reason "has a Power Word" once its `powerWord` field holds non-blank text.
// Gate for where a reason is allowed to show: until a Power Word is given, the
// reason is hidden from the Reasons Master and the Grip Test; the moment one is
// filled in, the reason appears in both. Reads only the existing field — no
// stored data or other logic is changed.
export function hasPowerWord(reason) {
  return (reason?.powerWord || '').trim() !== '';
}

// Reasons from earlier SAVED assessments that still have no Power Word. These
// are what the user must go back and complete in Previous Assessments before a
// brand-new assessment can move forward. The session currently in progress (its
// id is passed in) is excluded — its own Power Words are assigned later in its
// own flow — and archived reasons are ignored. Read-only: it only reads stored
// sessions, nothing is changed.
export function previousReasonsMissingPowerWord(currentSessionId) {
  return reasonEliminatorService
    .listSessions()
    .filter((s) => s.id !== currentSessionId)
    .flatMap((s) =>
      (Array.isArray(s.reasons) ? s.reasons : []).filter(
        (r) => !r.archived && !hasPowerWord(r)
      )
    );
}

// A reason counts as FULLY assessed only when it has a category, a subcategory,
// a power word AND a saved grip score. Grip scores live in their own store
// (keyed by reason id), so they're looked up rather than read off the reason.
export function isFullyAssessed(reason) {
  if (!reason) return false;
  const hasCategory =
    Array.isArray(reason.categories) && reason.categories.length > 0;
  const hasSubcategory =
    Array.isArray(reason.details) && reason.details.length > 0;
  const hasPowerWord = (reason.powerWord || '').trim() !== '';
  const grip = gripTestService.getForReason(reason.id);
  const hasGrip = !!grip && typeof grip.score === 'number';
  return hasCategory && hasSubcategory && hasPowerWord && hasGrip;
}

// Reasons that should appear in "View Full Assessment" and "Previous
// Assessments": every active (non-archived) reason, plus archived reasons that
// were fully completed before archiving. A reason archived BEFORE completion is
// hidden from these views (its data still lives in storage and the Archived
// section, so it can be unarchived later).
export function visibleAssessmentReasons(reasons = []) {
  return reasons.filter((r) => !r.archived || isFullyAssessed(r));
}

// A session counts as a COMPLETED assessment only when the whole flow is done
// for every active reason — category, subcategory, power word AND grip score.
// Until the Grip Test is finished for all of them, the session is still in
// progress and should not appear in Previous Assessments.
export function isSessionComplete(session) {
  const reasons = Array.isArray(session?.reasons) ? session.reasons : [];
  const active = reasons.filter((r) => !r.archived);
  return active.length > 0 && active.every(isFullyAssessed);
}

// A reason counts as ASSESSED once it has a category, a subcategory AND a power
// word. The Grip Test score is NOT required here, so a reason qualifies as soon
// as the assessment + power word flow is finished for it.
export function isReasonAssessed(reason) {
  if (!reason) return false;
  const hasCategory =
    Array.isArray(reason.categories) && reason.categories.length > 0;
  const hasSubcategory =
    Array.isArray(reason.details) && reason.details.length > 0;
  const hasPowerWord = (reason.powerWord || '').trim() !== '';
  return hasCategory && hasSubcategory && hasPowerWord;
}

// A session is ASSESSED when every active reason has its category, subcategory
// and power word filled in (Grip Test not required). Used by Previous
// Assessments so a session shows up as soon as the Power Word step is finished,
// even before the Grip Test is done.
export function isSessionAssessed(session) {
  const reasons = Array.isArray(session?.reasons) ? session.reasons : [];
  const active = reasons.filter((r) => !r.archived);
  return active.length > 0 && active.every(isReasonAssessed);
}
