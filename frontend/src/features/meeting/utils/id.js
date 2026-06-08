// Collision-proof unique id generator.
//
// The app previously built ids as `'meeting-' + Date.now()`, which has only
// millisecond resolution — so duplicating a card rapidly (or seeding several
// records) produced IDENTICAL ids. Identical ids become identical React `key`s
// in list .map()s, which makes React drop/duplicate DOM nodes (cards "vanish")
// even though the underlying array is intact. This helper guarantees uniqueness.

let counter = 0;

export const makeId = (prefix = 'id') => {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;

  // Prefer the platform UUID (available in secure contexts incl. localhost).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  // Fallback: time + randomness + a monotonic counter (unique even within 1ms).
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${time}-${rand}-${counter}`;
};
