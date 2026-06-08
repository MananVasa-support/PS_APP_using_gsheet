// Shared, read-only date-period helpers for the Search + Filter bars added to
// Reasons Master, Previous Assessments and Grip Test History. Nothing here
// mutates state or storage — it only decides whether a date falls inside the
// selected period, so the existing data and logic are untouched.

export const DATE_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Date Range' },
];

export function periodLabel(value) {
  return DATE_PERIODS.find((p) => p.value === value)?.label || 'All Time';
}

// 'YYYY-MM-DD' day key in the viewer's LOCAL calendar day. The custom-range
// picker (<input type="date">) yields local 'YYYY-MM-DD' values, so the stored
// ISO timestamp must be bucketed by the same local day — otherwise an item
// created in local early hours lands on the previous UTC day and falls outside a
// range like "4 to 5". Already date-only strings are returned unchanged.
function dayKey(iso) {
  const s = String(iso || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// True when `iso` falls inside the selected period, measured against today's
// date (or the supplied { from, to } bounds for the custom range).
export function inDatePeriod(iso, period, custom = {}) {
  if (!period || period === 'all') return true;
  if (!iso) return false;

  if (period === 'custom') {
    const { from = '', to = '' } = custom || {};
    if (!from && !to) return true;
    const day = dayKey(iso);
    if (!day) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  switch (period) {
    case 'today':
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    case 'week': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return d >= start && d <= now;
    }
    case 'month':
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    case 'quarter':
      return (
        d.getFullYear() === now.getFullYear() &&
        Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3)
      );
    case 'year':
      return d.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}
