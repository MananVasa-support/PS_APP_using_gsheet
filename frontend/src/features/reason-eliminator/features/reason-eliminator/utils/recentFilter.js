// Shared, read-only "recent" filter used by Reasons Master, the Dashboard and
// Previous Assessments. It replaces the date-period dropdown with simple
// count-based options (Latest / Last 3 / Last 5 / Last 10 / All) plus a
// From – To custom date range. Nothing here mutates state or storage — it only
// decides which records to show, so existing data and handlers are untouched.
import { inDatePeriod } from './datePeriods.js';

export const RECENT_FILTERS = [
  { value: 'latest', label: 'Latest', count: 1 },
  { value: 'last3', label: 'Last 3', count: 3 },
  { value: 'last5', label: 'Last 5', count: 5 },
  { value: 'last10', label: 'Last 10', count: 10 },
  { value: 'all', label: 'All', count: Infinity },
  { value: 'custom', label: 'From – To', count: null },
];

// How many of the most recent records a filter value keeps (Infinity = all).
export function recentCount(value) {
  const opt = RECENT_FILTERS.find((o) => o.value === value);
  return opt ? opt.count : Infinity;
}

// Filter a list to the selected recent option.
//   items   – the records to filter
//   value   – one of the RECENT_FILTERS values
//   getDate – (item) => ISO date string used for recency / range
//   custom  – { from, to } 'YYYY-MM-DD' bounds, only used when value === 'custom'
// For the count options the list is sorted newest-first and sliced; for 'custom'
// it falls back to the existing local-day range test; 'all' returns everything.
export function filterRecent(items, value, getDate, custom = {}) {
  const list = Array.isArray(items) ? items : [];
  if (value === 'custom') {
    const { from = '', to = '' } = custom || {};
    if (!from && !to) return list;
    return list.filter((it) =>
      inDatePeriod(getDate(it), 'custom', { from, to })
    );
  }
  const count = recentCount(value);
  if (!Number.isFinite(count)) return list; // 'all'
  return [...list]
    .sort(
      (a, b) =>
        new Date(getDate(b) || 0).getTime() - new Date(getDate(a) || 0).getTime()
    )
    .slice(0, count);
}
