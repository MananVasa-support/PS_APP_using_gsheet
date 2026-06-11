/**
 * Real Time Auditor analytics — computed from the user's ACTUAL saved
 * assessments (no random/demo numbers). Each chart pulls exactly the data it
 * needs:
 *
 *   Total / Productive / Planned / Unproductive hours → summed from each
 *     assessment's stats (which were computed from the user's slot answers).
 *   Productivity trend → one point per calendar DAY (average productivity of
 *     that day's assessments).
 *   Daily productivity → average productivity per WEEKDAY (Mon..Sun).
 *   Weekly productivity → average productivity per calendar week in range.
 *   Top active periods → built from the SLOTS themselves: each slot's start
 *     time is bucketed into a day-period (6–9 AM … 6–9 PM) and we measure what
 *     % of that period's slots were Productive.
 */

const SLOT_MINUTES = 30;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PERIODS = [
  { range: '6–9 AM', from: 6 * 60, to: 9 * 60 },
  { range: '9 AM–12 PM', from: 9 * 60, to: 12 * 60 },
  { range: '12–3 PM', from: 12 * 60, to: 15 * 60 },
  { range: '3–6 PM', from: 15 * 60, to: 18 * 60 },
  { range: '6–9 PM', from: 18 * 60, to: 21 * 60 },
];

/** Filter assessments to the chosen window. */
export function filterByRange(assessments, { days = null, start = null, end = null, latestOnly = false } = {}) {
  const list = assessments || [];
  if (latestOnly) return list.length ? [list[0]] : [];
  if (start && end) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime() + 86400000; // include the end day
    return list.filter((a) => {
      const t = new Date(a.date).getTime();
      return t >= s && t < e;
    });
  }
  if (days && days < 365) {
    const cutoff = Date.now() - days * 86400000;
    return list.filter((a) => new Date(a.date).getTime() >= cutoff);
  }
  return list;
}

export function buildRealAnalytics(assessments) {
  const list = assessments || [];

  // ── Totals (each assessment's stats were computed from its slots) ──────────
  const sum = (key) => list.reduce((s, a) => s + (a.stats?.[key] || 0), 0);
  const totalTracked = sum('totalMin');
  const productiveMin = sum('productiveMin');
  const plannedMin = sum('plannedMin');
  const unproductiveMin = sum('unproductiveMin');

  const avgProductivity = list.length
    ? Math.round(list.reduce((s, a) => s + (a.stats?.productivityPct || 0), 0) / list.length)
    : 0;

  // ── Trend: one point per calendar day ──────────────────────────────────────
  const byDay = new Map(); // 'YYYY-MM-DD' → [pct, ...]
  list.forEach((a) => {
    const d = new Date(a.date);
    const key = d.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(a.stats?.productivityPct || 0);
  });
  const trend = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, vals]) => {
      const d = new Date(key);
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        productivity: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      };
    });

  // ── Daily: average per weekday ──────────────────────────────────────────────
  const weekdayBuckets = WEEKDAYS.map(() => []);
  list.forEach((a) => {
    const idx = (new Date(a.date).getDay() + 6) % 7; // JS Sun=0 → Mon-first index
    weekdayBuckets[idx].push(a.stats?.productivityPct || 0);
  });
  const daily = WEEKDAYS.map((label, i) => ({
    label,
    value: weekdayBuckets[i].length
      ? Math.round(weekdayBuckets[i].reduce((s, v) => s + v, 0) / weekdayBuckets[i].length)
      : 0,
  }));

  // ── Weekly: average per calendar week (oldest → newest) ────────────────────
  const byWeek = new Map(); // 'year-week' → [pct]
  list.forEach((a) => {
    const d = new Date(a.date);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-${String(week).padStart(2, '0')}`;
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push(a.stats?.productivityPct || 0);
  });
  const weekly = [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, vals], i) => ({
      label: `W${i + 1}`,
      value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));

  // ── Top active periods: from the raw slots ──────────────────────────────────
  const periodStats = PERIODS.map((p) => ({ ...p, productive: 0, total: 0 }));
  list.forEach((a) => {
    (a.slots || []).forEach((slot) => {
      const m = ((slot.startMin % (24 * 60)) + 24 * 60) % (24 * 60);
      const bucket = periodStats.find((p) => m >= p.from && m < p.to);
      if (!bucket) return;
      bucket.total += 1;
      if (slot.classification === 'Productive') bucket.productive += 1;
    });
  });
  const topPeriods = periodStats
    .filter((p) => p.total > 0)
    .map((p) => ({ range: p.range, pct: Math.round((p.productive / p.total) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  return {
    count: list.length,
    totalTracked,
    productiveMin,
    plannedMin,
    unproductiveMin,
    avgProductivity,
    trend,
    daily,
    weekly,
    topPeriods,
    totalSlotMin: totalTracked || list.reduce((s, a) => s + (a.slots?.length || 0) * SLOT_MINUTES, 0),
  };
}
