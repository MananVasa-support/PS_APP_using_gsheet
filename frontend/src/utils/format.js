/**
 * Small formatting helpers used across pages.
 */

/** 145 -> "2h 25m" */
export function formatMinutes(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** 1248 -> "1,248" */
export function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

/** 98765 -> "$98,765" */
export function formatCurrency(n, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Date -> "May 21, 2026" */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Title-case a person's name as they type: "john doe" -> "John Doe".
 * Capitalises ONLY the first letter of every space-separated word and preserves
 * everything else exactly as typed (and trailing whitespace, so the caret keeps
 * behaving naturally mid-type). "naresh" -> "Naresh", "vinod" -> "Vinod",
 * "anna" -> "Anna" — no letter is changed except each word's first character.
 */
export function titleCaseName(value = '') {
  return value.replace(/(^|\s)(\S)/g, (_, sep, ch) => sep + ch.toUpperCase());
}

/** Build "AM" initials from a name: "Alex Morgan" -> "AM" */
export function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Provisional client ID shown on the signup form, e.g. "CLIENT-04821".
 * This is only a preview — the backend assigns the final sequential ID on register.
 */
export function generateClientId() {
  const rand = Math.floor(Math.random() * 100000);
  return `CLIENT-${String(rand).padStart(5, '0')}`;
}
