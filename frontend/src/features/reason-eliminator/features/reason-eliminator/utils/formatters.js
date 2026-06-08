export function formatDate(input) {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(input) {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function reasonLabel(index) {
  return `R${index + 1}`;
}

// Display label for a reason, derived purely from its position in the list
// (index 0 = R1, index 1 = R2, ...). The number is never read from stored data,
// so the sequence is recalculated on every render and can never have gaps after
// a deletion — the remaining reasons simply shift up. The `reason` arg is kept
// for call-site compatibility; only the position drives the number.
export function reasonNumber(reason, position = 0) {
  return `R${position + 1}`;
}

// The number the next new reason should get.
export function nextReasonSeq(reasons = []) {
  return reasons.reduce((max, r) => Math.max(max, r.seq || 0), 0) + 1;
}

// A signature of the reason list's identity + text. Changes only when a reason
// is added, deleted, or its text edited — NOT when categories/power words are
// filled in. Used to detect whether the Reasons section was actually changed.
export function reasonsSignature(reasons = []) {
  return JSON.stringify(reasons.map((r) => [r.id, (r.text || '').trim()]));
}

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
