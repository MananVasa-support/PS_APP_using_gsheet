import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RED = '#ef4444';
// Distinct, non-overlapping hues so slices/bars are easy to tell apart.
const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981', '#8b5cf6'];
const OTHERS_COLOR = '#9ca3af';
// Minutes → compact, readable label (hours once it passes 2h).
const fmtChartTime = (min) => (min > 120 ? `${(min / 60).toFixed(1)}h` : `${Math.round(min)}m`);
// Minutes → hours for axis ticks, e.g. 120 → "2h", 90 → "1.5h", 0 → "0".
const fmtHoursTick = (min) => {
  if (!min) return '0';
  const h = min / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
};
const PERIODS = [
  { key: 'latest', label: 'Latest' },
  { key: '3', label: 'Last 3 Days' },
  { key: '5', label: 'Last 5 Days' },
  { key: '10', label: 'Last 10 Days' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'From - To' },
];
const DAY = 24 * 60 * 60 * 1000;

// Reusable, UI-agnostic date filter. Returns the assessments that fall in the period.
const filterByPeriod = (assessments, period, fromDate, toDate) => {
  if (period === 'all') return assessments;
  if (period === 'latest') {
    if (assessments.length === 0) return [];
    const latest = assessments.reduce((a, b) =>
      new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime() ? b : a
    );
    return [latest];
  }
  if (period === 'custom') {
    if (!fromDate || !toDate) return [];
    const start = new Date(fromDate).getTime();
    const end = new Date(toDate).getTime() + DAY - 1;
    if (start > new Date(toDate).getTime()) return [];
    return assessments.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t >= start && t <= end;
    });
  }
  const cutoff = Date.now() - Number(period) * DAY;
  return assessments.filter((a) => new Date(a.createdAt).getTime() >= cutoff);
};
const ACTION_SET = ['Automate', 'Delegate', 'Reduce', 'Stop'];

const toMin = (t) => {
  if (!t) return 0;
  if (typeof t === 'object') return (t.hours || 0) * 60 + (t.minutes || 0);
  const h = parseInt(t.split('h')[0]) || 0;
  const m = parseInt(t.split('h')[1]) || 0;
  return h * 60 + m;
};
const fmtMins = (m) => {
  const r = Math.max(0, Math.round(m));
  return `${Math.floor(r / 60)}h ${r % 60}m`;
};
// STEP 12: reusable per-routine rows. Time is the routine's own logged time (one
// occurrence ≈ one day's entry); totals are summed across the range, not averaged.
const flatten = (assessments) =>
  assessments.flatMap((a) =>
    (a.routines || []).map((r) => {
      const timeMin = toMin(r.time);
      const action = ACTION_SET.includes(r.action) ? r.action : '';
      // Saving can never exceed the routine's own time. Automate/Delegate/Stop auto-fill
      // timeSaving to the full time; Reduce uses the user-entered reduced amount — so
      // min(timeSaving, time) yields the right saving for every action type.
      const savingMin = action ? Math.min(toMin(r.timeSaving), timeMin) : 0;
      return {
        name: r.name || '-',
        category: r.category || 'Others',
        recurrence: r.recurrence || '',
        days: r.days || [],
        timeMin,
        action,
        savingMin,
        createdAt: a.createdAt,
      };
    })
  );

// Number of days represented by the selected range (used for max-time / usage %).
const rangeDayCount = (period, fromDate, toDate, assessments) => {
  switch (period) {
    case 'latest':
      return 1;
    case '3':
      return 3;
    case '5':
      return 5;
    case '10':
      return 10;
    case 'custom': {
      if (!fromDate || !toDate) return 0;
      const diff = Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / DAY);
      return Math.max(1, diff + 1);
    }
    default: {
      // 'all' → distinct calendar days that actually have data.
      const days = new Set(assessments.map((a) => new Date(a.createdAt).toDateString()));
      return Math.max(1, days.size);
    }
  }
};

// All metrics derived from a rows array — TOTAL aggregation across the range
// (not per-day averages). numberOfDays sets the available-time ceiling.
const computeMetrics = (rows, numberOfDays) => {
  const days = Math.max(1, numberOfDays || 1);
  const maxTime = 24 * 60 * days; // total available minutes in the range

  const totals = {};
  let totalTime = 0;
  let totalSaving = 0;
  for (const r of rows) {
    totalTime += r.timeMin;
    // saving per routine is already capped at its own time in flatten().
    totalSaving += r.savingMin;
    totals[r.category] = (totals[r.category] || 0) + r.timeMin;
  }

  // Validation rules:
  // 1) total time can't exceed the time physically available in the range.
  totalTime = Math.min(totalTime, maxTime);
  // 2) possible saving can never exceed total time spent.
  totalSaving = Math.min(totalSaving, totalTime);

  const byCategory = Object.entries(totals)
    .map(([name, time]) => ({ name, time: Math.round(Math.min(time, maxTime)) }))
    .filter((c) => c.time > 0)
    .sort((a, b) => b.time - a.time);
  const totalCat = byCategory.reduce((s, c) => s + c.time, 0) || 1;

  // Number of routines = UNIQUE routine names (duplicates counted once).
  const routineCount = new Set(rows.map((r) => r.name.trim().toLowerCase())).size;

  // Time usage % of available time, always clamped to 0–100.
  const usagePct = Math.min(100, Math.max(0, Math.round((totalTime / maxTime) * 100)));

  // Efficiency score — only meaningful when the range actually has data.
  // With no rows (no date range selected, or range has no data) the score is
  // null so the UI can show "--" instead of a misleading default.
  let score = null;
  if (rows.length > 0) {
    // Based on per-day average within the range.
    const avgPerDay = totalTime / days;
    const wastePerDay = (byCategory.find((c) => /waste/i.test(c.name))?.time || 0) / days;
    const hasFitness = byCategory.some((c) => /fitness/i.test(c.name));
    score = 100;
    if (avgPerDay > 720) score -= 30; // >12h/day on average
    if (wastePerDay > 240) score -= 20; // >4h/day on "waste"
    if (!hasFitness) score -= 10;
    score = Math.max(0, score);
  }

  return {
    totalTime: Math.round(totalTime),
    totalSaving: Math.round(totalSaving),
    routineCount,
    byCategory,
    totalCat,
    score,
    usagePct,
    numberOfDays: days,
  };
};

/* ---------- small UI pieces ---------- */

function Card({ children, className = '' }) {
  return (
    <div className={'rounded-xl bg-white p-6 shadow-md ring-1 ring-black/5 ' + className}>
      {children}
    </div>
  );
}
function Stat({ label, value, accent }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <motion.p
        key={String(value)}
        initial={{ opacity: 0.3, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className={'mt-2 text-3xl font-bold tabular-nums ' + (accent ? 'text-red-500' : 'text-black')}
      >
        {value}
      </motion.p>
    </Card>
  );
}
function ChartCard({ title, children }) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-black">{title}</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- Dashboard ---------- */

export default function Dashboard() {
  const navigate = useNavigate();
  const [assessmentsRaw, setAssessmentsRaw] = useState([]);
  const [period, setPeriod] = useState('latest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    let data = [];
    try {
      data = JSON.parse(localStorage.getItem('assessments')) || [];
    } catch {
      data = [];
    }
    setAssessmentsRaw(data);
  }, []);

  // From–To validation (derived → auto-clears when input becomes valid).
  const customEmpty = period === 'custom' && (!fromDate || !toDate);
  const customInvalid =
    period === 'custom' && !!fromDate && !!toDate && new Date(fromDate) > new Date(toDate);
  const customError = customEmpty
    ? 'Please select both From and To dates'
    : customInvalid
      ? 'From date cannot be greater than To date'
      : '';

  // Filtering pipeline: filter assessments by selected time period. Logic lives in filterByPeriod().
  const filteredAssessments = useMemo(
    () => filterByPeriod(assessmentsRaw, period, fromDate, toDate),
    [assessmentsRaw, period, fromDate, toDate]
  );

  const filteredRows = useMemo(() => flatten(filteredAssessments), [filteredAssessments]);
  const numberOfDays = useMemo(
    () => rangeDayCount(period, fromDate, toDate, filteredAssessments),
    [period, fromDate, toDate, filteredAssessments]
  );
  const metrics = useMemo(
    () => computeMetrics(filteredRows, numberOfDays),
    [filteredRows, numberOfDays]
  );

  // Human-readable range name for labels.
  const rangeName =
    period === 'latest'
      ? 'Latest'
      : period === 'all'
        ? 'All'
        : period === 'custom'
          ? 'Custom Range'
          : `Last ${period} Days`;

  // Grouped routine breakdown — duplicates (same name) summed into one row.
  const breakdown = useMemo(() => {
    const map = new Map();
    for (const r of filteredRows) {
      const key = r.name.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.timeMin += r.timeMin;
        existing.savingMin += r.savingMin;
        if (!existing.action && r.action) existing.action = r.action;
      } else {
        map.set(key, {
          name: r.name,
          category: r.category,
          timeMin: r.timeMin,
          savingMin: r.savingMin,
          action: r.action,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.timeMin - a.timeMin);
  }, [filteredRows]);

  // Bar chart: categories sorted high → low (computeMetrics already sorts byCategory desc).
  const barData = metrics.byCategory;

  // Pie/donut: keep only the top 4 categories, fold the rest into "Others".
  const pieData = useMemo(() => {
    const sorted = [...metrics.byCategory].sort((a, b) => b.time - a.time);
    const TOP = 4;
    if (sorted.length <= TOP + 1) return sorted;
    const top = sorted.slice(0, TOP);
    const othersTime = sorted.slice(TOP).reduce((s, c) => s + c.time, 0);
    return othersTime > 0 ? [...top, { name: 'Others', time: othersTime }] : top;
  }, [metrics.byCategory]);
  const pieTotal = pieData.reduce((s, c) => s + c.time, 0) || 1;

  const rangeLabel =
    period === 'latest'
      ? 'Showing latest assessment'
      : period === 'all'
        ? 'Showing all data'
        : period === 'custom'
          ? fromDate && toDate && !customInvalid
            ? `Showing data from ${new Date(fromDate).toLocaleDateString()} – ${new Date(toDate).toLocaleDateString()}`
            : 'Select a valid date range'
          : `Showing data for ${PERIODS.find((p) => p.key === period)?.label}`;

  // Smart insight: the single category with the most time/day (byCategory is sorted desc).
  // Saving = that category's actual possible saving, else a 10% reduction estimate.
  const topCategory = metrics.byCategory[0] || null;
  const topCategorySaving = topCategory
    ? (() => {
        const actual = filteredRows
          .filter((r) => r.category === topCategory.name && r.action)
          .reduce((s, r) => s + r.savingMin, 0);
        return Math.round(actual > 0 ? actual : topCategory.time * 0.1);
      })()
    : 0;

  // Trend: ONE point per assessment, sorted chronologically (old → new). X = date, Y = minutes.
  // Plotting per assessment (instead of aggregating by calendar day) means several
  // assessments logged on the SAME day still show as separate points — so the line appears
  // whenever there are 2+ records. "Latest" keeps only one assessment for the cards, so the
  // trend uses the last 7 assessments instead.
  const trend = useMemo(() => {
    const source =
      period === 'latest'
        ? [...assessmentsRaw]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .slice(-7)
        : [...filteredAssessments].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
    // If a day has multiple assessments, add the time to keep X-axis labels distinct.
    const perDay = {};
    source.forEach((a) => {
      const k = new Date(a.createdAt).toDateString();
      perDay[k] = (perDay[k] || 0) + 1;
    });
    return source.map((a) => {
      const d = new Date(a.createdAt);
      // Readable short label, e.g. "Jun 4" (adds the time when a day has multiple entries).
      const base = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      const date = perDay[d.toDateString()] > 1 ? `${base}, ${time}` : base;
      // Full date for the tooltip header, e.g. "Jun 4, 2026, 2:30 PM".
      const fullDate = `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
      const value = (a.routines || []).reduce((s, r) => s + toMin(r.time), 0);
      return { date, fullDate, value };
    });
  }, [period, assessmentsRaw, filteredAssessments]);

  return (
    <div className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto w-full max-w-[1100px]">
        {/* Header */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Time Finder · smart analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/time-finder/')}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/time-finder/previous-assessment')}
              className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-600"
            >
              Previous
            </button>
          </div>
        </header>

        {/* Time period filter */}
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented control */}
            <div className="inline-flex flex-wrap rounded-xl border border-gray-200 bg-white p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
                    (period === p.key ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-100')
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* From–To pickers */}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  From
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={
                      'rounded-lg border px-2 py-1.5 text-sm ' +
                      (customError ? 'border-red-400' : 'border-gray-300')
                    }
                  />
                </label>
                <span className="text-gray-400">–</span>
                <label className="flex items-center gap-1 text-xs text-gray-500">
                  To
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={
                      'rounded-lg border px-2 py-1.5 text-sm ' +
                      (customError ? 'border-red-400' : 'border-gray-300')
                    }
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Range label / validation */}
        <div className="mb-8">
          <p className={'text-sm transition-colors ' + (customError ? 'text-red-500' : 'text-gray-500')}>
            {customError || rangeLabel}
          </p>
        </div>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label={`Total Time (${rangeName})`} value={fmtMins(metrics.totalTime)} />
          <Stat label="Total Possible Saving" value={fmtMins(metrics.totalSaving)} accent />
          <Stat label="Number of Routines" value={metrics.routineCount} />
          <Stat label="Time Usage %" value={`${metrics.usagePct}%`} />
          <Stat
            label="Efficiency Score"
            value={metrics.score === null ? '--' : `${metrics.score}/100`}
            accent
          />
        </section>

        {/* Smart Insights — max 2 lines */}
        <section className="mb-8">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-black">Smart Insights</h2>
            {topCategory ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  You are spending most time on {topCategory.name} ({fmtMins(topCategory.time)})
                </p>
                <p className="text-sm font-semibold text-red-500">
                  Try reducing it to save up to {fmtMins(topCategorySaving)} daily
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No insights available yet</p>
            )}
          </Card>
        </section>

        {/* Charts */}
        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Time Spent by Category">
            <BarChart
              data={barData}
              margin={{ top: 10, right: 16, left: 4, bottom: 24 }}
              barCategoryGap="25%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                interval={0}
                tickMargin={8}
                label={{ value: 'Categories', position: 'insideBottom', offset: -14, fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={fmtChartTime}
                width={48}
                label={{ value: 'Time Spent', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#6b7280', style: { textAnchor: 'middle' } }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                formatter={(v) => [fmtMins(v), 'Time']}
              />
              <Bar dataKey="time" name="Time" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {barData.map((entry, i) => (
                  <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartCard>

          <ChartCard title="Time Distribution (%)">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="time"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={52}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === 'Others' ? OTHERS_COLOR : CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${fmtMins(v)} (${Math.round((v / pieTotal) * 100)}%)`, name]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value, entry) =>
                  `${value} · ${Math.round((entry.payload.time / pieTotal) * 100)}%`
                }
              />
            </PieChart>
          </ChartCard>
        </section>

        <section className="mb-8">
          {trend.length < 2 ? (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-black">Total Time ({rangeName})</h2>
              <div className="flex h-64 w-full items-center justify-center text-sm text-gray-400">
                Only one record. Add more data to see trend
              </div>
            </Card>
          ) : (
            <ChartCard title={`Total Time (${rangeName})`}>
              <LineChart data={trend} margin={{ top: 10, right: 24, left: 12, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickMargin={8}
                  label={{
                    value: 'Date',
                    position: 'insideBottom',
                    offset: -16,
                    fontSize: 12,
                    fill: '#374151',
                  }}
                />
                <YAxis
                  width={52}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={fmtHoursTick}
                  label={{
                    value: 'Time Spent (hours)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 12,
                    fill: '#374151',
                    style: { textAnchor: 'middle' },
                  }}
                />
                <Tooltip
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                  formatter={(v) => [fmtMins(v), 'Time Spent']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Time Spent"
                  stroke={RED}
                  strokeWidth={2}
                  dot={{ r: 4, fill: RED }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartCard>
          )}
        </section>

        {/* Routine breakdown */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-black">Routine Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="border-b border-gray-200 px-4 py-3">Routine</th>
                  <th className="border-b border-gray-200 px-4 py-3">Category</th>
                  <th className="border-b border-gray-200 px-4 py-3">Total Time</th>
                  <th className="border-b border-gray-200 px-4 py-3">Saving Type</th>
                  <th className="border-b border-gray-200 px-4 py-3">Saving</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="hover:bg-gray-50">
                    <td className="border-b border-gray-100 px-4 py-3 text-black">{r.name}</td>
                    <td className="border-b border-gray-100 px-4 py-3 text-gray-700">{r.category}</td>
                    <td className="border-b border-gray-100 px-4 py-3 tabular-nums text-gray-700">
                      {fmtMins(r.timeMin)}
                    </td>
                    <td className="border-b border-gray-100 px-4 py-3">
                      {r.action ? (
                        <span className="inline-flex h-6 items-center rounded-full bg-red-50 px-2 text-xs font-bold text-red-500">
                          {r.action}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="border-b border-gray-100 px-4 py-3 tabular-nums font-medium text-red-500">
                      {r.savingMin > 0 ? fmtMins(r.savingMin) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
