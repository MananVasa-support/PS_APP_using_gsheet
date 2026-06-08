// Presentation helpers shared by the Meeting List and Meeting Details pages.

// Valid meeting statuses (order = display order in the status switcher)
export const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

// Theme-consistent style per status (white / black / red palette + emerald success accent)
export const statusStyles = {
  Upcoming: 'bg-brand-red-tint text-brand-red border-brand-red/30',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-surface-alt text-muted border-line line-through'
};

// Color-coded status badge (Meeting List cards): Upcoming=Blue, Completed=Green, Cancelled=Red.
export const statusBadgeStyles = {
  Upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-brand-red-tint text-brand-red border-brand-red/30'
};

// Convert an HH/MM duration string to a friendly display label.
// Edge cases: 00/00 → "Not Specified", 05/00 → "5 Hours", 00/30 → "30 Minutes".
// Falls back gracefully for legacy numeric-only values.
export const formatEstTime = (val) => {
  if (!val) return '—';
  const match = String(val).match(/^(\d{1,2})\/(\d{2})$/);
  if (!match) {
    // Legacy fallback: plain number like "30" → "30 mins"
    return /^\d+$/.test(val) ? `${val} mins` : val;
  }
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h === 0 && m === 0) return 'Not Specified';
  const hLabel = h === 1 ? 'Hour' : 'Hours';
  const mLabel = m === 1 ? 'Minute' : 'Minutes';
  if (h === 0) return `${m} ${mLabel}`;
  if (m === 0) return `${h} ${hLabel}`;
  return `${h} ${hLabel} ${m} ${mLabel}`;
};

// Parse an HH/MM duration string into total minutes (null if unparseable).
export const durationToMinutes = (val) => {
  if (typeof val !== 'string') return null;
  const m = val.match(/^(\d{1,2})\/(\d{2})$/);
  if (!m) return null;
  const mins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return Number.isFinite(mins) ? mins : null;
};

// Render a minutes value as a friendly label (e.g. 90 → "1 Hour 30 Minutes",
// -30 → "-30 Minutes"). Returns "—" for null/NaN.
export const minutesToLabel = (mins) => {
  if (mins == null || Number.isNaN(mins)) return '—';
  const negative = mins < 0;
  const abs = Math.abs(Math.round(mins));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? 'Hour' : 'Hours'}`);
  if (m > 0 || h === 0) parts.push(`${m} ${m === 1 ? 'Minute' : 'Minutes'}`);
  return (negative ? '-' : '') + parts.join(' ');
};

export const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
};
