/**
 * Frontend-only form validation helpers. Every form in the app uses this
 * single error message so the UX stays consistent.
 */

export const MANDATORY_MSG = 'Please complete all mandatory fields before submitting the form.';
export const FIELD_REQUIRED_MSG = 'This field is required.';

/** True when the value is "empty" for validation purposes. */
export function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}
