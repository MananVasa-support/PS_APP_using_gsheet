import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '../context/MeetingContext';
import {
  durationToMinutes, minutesToLabel, formatEstTime, formatDate, statusBadgeStyles,
} from '../utils/meetingFormat';
import { extractKeywords } from '../utils/keywords';
import {
  FiCalendar, FiClock, FiCheckCircle, FiXCircle, FiTrendingUp,
  FiZap, FiActivity, FiTarget, FiBarChart2, FiPlusCircle,
  FiArrowDownRight, FiArrowUpRight, FiChevronDown, FiInfo, FiAward, FiAlertTriangle,
} from 'react-icons/fi';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const RED = '#DC2626';
const BLUE = '#2563EB';
const GREEN = '#059669';
const INK = '#111827';

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const nums = (arr) => arr.filter((n) => typeof n === 'number' && !Number.isNaN(n));
const fmtScore = (v) => (v == null ? '—' : `${v.toFixed(1)}/5`);

// ---- Time-range filtering -------------------------------------------------
const TIME_FILTERS = [
  { key: 'latest', label: 'Latest' },
  { key: 'last3', label: 'Last 3 Days' },
  { key: 'last5', label: 'Last 5 Days' },
  { key: 'last10', label: 'Last 10 Days' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'From - To' },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_BACK = { last3: 3, last5: 5, last10: 10 };

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Parse a YYYY-MM-DD <input type="date"> value as a LOCAL date (avoids the
// UTC off-by-one that `new Date('YYYY-MM-DD')` would introduce).
const parseLocalDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Does the meeting's created date fall inside the selected range?
const inRange = (iso, filter, now, from, to) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  if (filter === 'all') return true; // every meeting, no date filter
  if (filter === 'latest') {
    // Only meetings created today (same local calendar day as `now`).
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
  }
  if (filter === 'custom') {
    const fromD = parseLocalDate(from);
    const toD = parseLocalDate(to);
    if (!fromD && !toD) return true; // no bounds chosen yet → show everything
    const t = d.getTime();
    if (fromD && t < fromD.getTime()) return false;
    if (toD && t > toD.getTime() + DAY_MS - 1) return false; // include the whole "to" day
    return true;
  }
  const days = DAYS_BACK[filter] || 0;
  // N calendar days inclusive of today.
  const cutoff = startOfDay(now).getTime() - (days - 1) * DAY_MS;
  return d.getTime() >= cutoff;
};

// DD/MM/YYYY from a YYYY-MM-DD input value.
const dmyFromInput = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

// Human-friendly label describing the active range (shown in the subtitle).
const rangeLabel = (filter, from, to) => {
  switch (filter) {
    case 'latest':
      return `Today · ${formatDMY(new Date())}`;
    case 'last3':
      return 'Last 3 days';
    case 'last5':
      return 'Last 5 days';
    case 'last10':
      return 'Last 10 days';
    case 'all':
      return 'All meetings';
    case 'custom':
      if (from && to) return `${dmyFromInput(from)} – ${dmyFromInput(to)}`;
      if (from) return `From ${dmyFromInput(from)}`;
      if (to) return `Until ${dmyFromInput(to)}`;
      return 'Custom range';
    default:
      return '';
  }
};

// DD/MM/YYYY for the meeting dropdown.
const formatDMY = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// Status → colored dot (Completed=green, Upcoming=blue, Cancelled=red).
const STATUS_DOT = {
  Completed: 'bg-emerald-500',
  Upcoming: 'bg-blue-500',
  Cancelled: 'bg-red-500',
};
const statusDot = (status) => STATUS_DOT[status] || STATUS_DOT.Upcoming;

export default function Dashboard() {
  const { meetings } = useMeeting();
  const navigate = useNavigate();

  // Time-range filter (default: Latest) + custom From/To dates + selected meeting.
  const [timeFilter, setTimeFilter] = useState('latest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedId, setSelectedId] = useState('all');

  // Validate the custom From - To range before it drives any calculations.
  const customError = useMemo(() => {
    if (timeFilter !== 'custom') return null;
    if (!fromDate || !toDate) return 'Please select both From and To dates';
    const f = parseLocalDate(fromDate);
    const t = parseLocalDate(toDate);
    if (f && t && f.getTime() > t.getTime()) return 'From Date cannot be greater than To Date';
    return null;
  }, [timeFilter, fromDate, toDate]);

  // Meetings inside the selected range, newest first — drives EVERY metric below.
  const filteredMeetings = useMemo(() => {
    if (customError) return []; // invalid custom range → no data until corrected
    const now = new Date();
    return meetings
      .filter((m) => inRange(m.createdDate, timeFilter, now, fromDate, toDate))
      .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  }, [meetings, timeFilter, fromDate, toDate, customError]);

  const currentRangeLabel = useMemo(
    () => rangeLabel(timeFilter, fromDate, toDate),
    [timeFilter, fromDate, toDate]
  );

  // Reset the meeting selection whenever it leaves the current range
  // (filter change, deletion, or archive).
  useEffect(() => {
    if (selectedId !== 'all' && !filteredMeetings.some((m) => m.id === selectedId)) {
      setSelectedId('all');
    }
  }, [filteredMeetings, selectedId]);

  const selectedMeeting =
    selectedId === 'all' ? null : filteredMeetings.find((m) => m.id === selectedId) || null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-mkink">Dashboard</h2>
        <p className="text-xs text-muted mt-0.5">
          {selectedMeeting
            ? 'Insights for the selected meeting.'
            : `Insights across your meetings — showing ${currentRangeLabel}.`}
        </p>
      </div>

      {/* Filter bar: time period (top) + meeting selector (below) */}
      {meetings.length > 0 && (
        <div className="bg-surface border border-line rounded-2xl shadow-card p-4 sm:p-5 space-y-4">
          <TimeFilter
            value={timeFilter}
            onChange={setTimeFilter}
            from={fromDate}
            to={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            error={customError}
          />
          <div className="border-t border-line pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <p className="text-xs text-muted">
              <span className="font-bold uppercase tracking-wider">In range:</span>{' '}
              <span className="font-semibold text-mkink">
                {filteredMeetings.length} {filteredMeetings.length === 1 ? 'meeting' : 'meetings'}
              </span>{' '}
              · {currentRangeLabel}
            </p>
            <MeetingSelector
              meetings={filteredMeetings}
              value={selectedId}
              onChange={setSelectedId}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${timeFilter}-${selectedId}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-8"
        >
          {meetings.length === 0 ? (
            <EmptyState onPlan={() => navigate('/meeting-framework/')} />
          ) : customError ? (
            <CustomRangePrompt message={customError} />
          ) : filteredMeetings.length === 0 ? (
            <NoRangeState label={currentRangeLabel} onShowAll={() => setTimeFilter('latest')} />
          ) : selectedMeeting ? (
            <SingleMeetingView meeting={selectedMeeting} />
          ) : (
            <AllMeetingsView meetings={filteredMeetings} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================ Time filter ============================
function TimeFilter({ value, onChange, from, to, onFromChange, onToChange, error }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">Time Period</p>
        <div className="flex flex-wrap gap-2">
          {TIME_FILTERS.map((f) => {
            const active = value === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onChange(f.key)}
                aria-pressed={active}
                className={
                  'px-4 py-2 rounded-lg border text-xs font-bold transition-all duration-200 select-none ' +
                  (active
                    ? 'bg-brand-red border-brand-red text-white shadow-red'
                    : 'bg-surface border-line text-muted hover:text-mkink hover:border-muted-soft')
                }
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom date range (From - To) */}
      <AnimatePresence>
        {value === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="flex-1">
                <label htmlFor="fromDate" className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  From Date
                </label>
                <input
                  id="fromDate"
                  type="date"
                  value={from}
                  onChange={(e) => onFromChange(e.target.value)}
                  className="w-full bg-surface border border-line text-sm font-semibold text-mkink rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="toDate" className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  To Date
                </label>
                <input
                  id="toDate"
                  type="date"
                  value={to}
                  onChange={(e) => onToChange(e.target.value)}
                  className="w-full bg-surface border border-line text-sm font-semibold text-mkink rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all"
                />
              </div>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 bg-brand-red-tint border border-brand-red/30 text-brand-red px-3 py-2 rounded-lg">
                <FiAlertTriangle className="shrink-0" />
                <span className="text-xs font-semibold">{error}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================ Meeting selector ============================
// Custom dropdown (native <select> can't render colored status dots reliably).
function MeetingSelector({ meetings, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = value === 'all' ? null : meetings.find((m) => m.id === value) || null;

  const choose = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="w-full sm:w-80 shrink-0" ref={ref}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
        Select a Meeting
      </p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-2 bg-surface border border-line text-sm font-semibold text-mkink rounded-xl pl-4 pr-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all"
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(selected.status)}`} />
                <span className="truncate">
                  {selected.title}
                  <span className="text-muted font-normal"> - {formatDMY(selected.createdDate)}</span>
                </span>
              </>
            ) : (
              <span>All Meetings</span>
            )}
          </span>
          <FiChevronDown
            className={`text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-2 w-full max-h-72 overflow-y-auto bg-surface border border-line rounded-xl shadow-lg py-1"
            >
              <li>
                <button
                  type="button"
                  onClick={() => choose('all')}
                  className={`w-full text-left px-4 py-2.5 text-sm font-semibold flex items-center gap-2 hover:bg-surface-alt transition-colors ${
                    value === 'all' ? 'text-brand-red' : 'text-mkink'
                  }`}
                >
                  All Meetings
                </button>
              </li>
              {meetings.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => choose(m.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-surface-alt transition-colors ${
                      value === m.id ? 'bg-surface-alt' : ''
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(m.status)}`} />
                    <span className="truncate text-mkink font-medium">
                      {m.title}
                      <span className="text-muted font-normal"> - {formatDMY(m.createdDate)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Shown when the active time range contains no meetings.
function NoRangeState({ label, onShowAll }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-line bg-surface rounded-2xl shadow-card">
      <FiCalendar className="text-5xl text-brand-red mb-4" />
      <h3 className="text-lg font-bold text-mkink mb-2">No meetings in this period</h3>
      <p className="text-muted text-xs max-w-sm mb-6">
        There are no meetings for {label}. Try a different time period or view all meetings.
      </p>
      <button
        onClick={onShowAll}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand-red text-white text-xs font-bold uppercase rounded-lg hover:bg-brand-red-dark transition-colors"
      >
        Show All Meetings
      </button>
    </div>
  );
}

// Shown when the custom From - To range is incomplete or invalid.
function CustomRangePrompt({ message }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-line bg-surface rounded-2xl shadow-card">
      <FiAlertTriangle className="text-5xl text-brand-red mb-4" />
      <h3 className="text-lg font-bold text-mkink mb-2">Check your date range</h3>
      <p className="text-muted text-xs max-w-sm">{message}</p>
    </div>
  );
}

// ============================ All meetings view ============================
function AllMeetingsView({ meetings }) {
  const d = useMemo(() => {
    const data = meetings; // active set (archived already excluded by context)

    const total = data.length;
    const upcoming = data.filter((m) => m.status === 'Upcoming').length;
    const completed = data.filter((m) => m.status === 'Completed').length;
    const cancelled = data.filter((m) => m.status === 'Cancelled').length;

    const avgAwareness = avg(nums(data.map((m) => m.experience?.awareness)));
    const avgConfidence = avg(nums(data.map((m) => m.experience?.confidence)));
    const avgSuccess = avg(nums(data.map((m) => m.experience?.success)));
    const avgPlanning = avg(nums(data.map((m) => m.reflection?.planningHelpfulness)));

    const times = data
      .map((m) => ({
        before: durationToMinutes(m.answers?.q3),
        after: durationToMinutes(m.answers?.q17),
      }))
      .filter((t) => t.before != null && t.after != null);
    const avgBefore = avg(times.map((t) => t.before));
    const avgAfter = avg(times.map((t) => t.after));
    const avgDiff = avgBefore != null && avgAfter != null ? avgAfter - avgBefore : null;

    const realisationKeywords = extractKeywords(
      data.map((m) => m.experience?.realisation).filter(Boolean)
    );
    const learningKeywords = extractKeywords(
      data.map((m) => m.reflection?.learnings).filter(Boolean)
    );

    const statusData = [
      { name: 'Upcoming', value: upcoming, color: BLUE },
      { name: 'Completed', value: completed, color: GREEN },
      { name: 'Cancelled', value: cancelled, color: RED },
    ];
    const ratingsData = [
      { name: 'Planning', value: Number((avgPlanning ?? 0).toFixed(1)) },
      { name: 'Success', value: Number((avgSuccess ?? 0).toFixed(1)) },
      { name: 'Confidence', value: Number((avgConfidence ?? 0).toFixed(1)) },
      { name: 'Awareness', value: Number((avgAwareness ?? 0).toFixed(1)) },
    ];

    const byMonth = {};
    data.forEach((m) => {
      const date = new Date(m.createdDate);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      if (!byMonth[key]) byMonth[key] = { key, label, created: 0, completed: 0 };
      byMonth[key].created += 1;
      if (m.status === 'Completed') byMonth[key].completed += 1;
    });
    const trendData = Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));

    return {
      total, upcoming, completed, cancelled,
      avgAwareness, avgConfidence, avgSuccess, avgPlanning,
      avgBefore, avgAfter, avgDiff,
      realisationKeywords, learningKeywords,
      statusData, ratingsData, trendData,
    };
  }, [meetings]);

  return (
    <div className="space-y-8">
      {/* 1–4. Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FiCalendar} label="Total Meetings" value={d.total} accent="ink" />
        <StatCard icon={FiClock} label="Upcoming Meetings" value={d.upcoming} accent="blue" />
        <StatCard icon={FiCheckCircle} label="Completed Meetings" value={d.completed} accent="green" />
        <StatCard icon={FiXCircle} label="Cancelled Meetings" value={d.cancelled} accent="red" />
      </div>

      {/* Charts: status distribution + average ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Meeting Status Distribution" icon={FiActivity}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {d.statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Average Ratings Overview" icon={FiBarChart2}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.ratingsData} margin={{ top: 8, right: 12, left: 12, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Rating Category', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#374151' }}
                />
                <YAxis
                  domain={[0, 5]}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Average Score (0–5)', angle: -90, position: 'insideLeft', offset: 16, style: { textAnchor: 'middle', fontSize: 12, fill: '#374151' } }}
                />
                <Tooltip cursor={{ fill: '#FEF2F2' }} />
                <Bar dataKey="value" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      {/* Completion trends */}
      <Section title="Meeting Completion Trends" icon={FiTrendingUp}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.trendData} margin={{ top: 8, right: 16, left: 12, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Month', position: 'insideBottom', offset: -12, fontSize: 12, fill: '#374151' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Number of Meetings', angle: -90, position: 'insideLeft', offset: 16, style: { textAnchor: 'middle', fontSize: 12, fill: '#374151' } }}
              />
              <Tooltip />
              <Legend verticalAlign="top" height={28} iconType="plainline" />
              <Line type="monotone" dataKey="created" name="Created" stroke={INK} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="completed" name="Completed" stroke={RED} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Actual vs Planned */}
      <Section title="Actual vs Planned Meeting" icon={FiTarget}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniMetric label="Avg Planning Experience" value={fmtScore(d.avgPlanning)} />
          <MiniMetric label="Avg Success Score" value={fmtScore(d.avgSuccess)} />
          <MiniMetric label="Avg Confidence Score" value={fmtScore(d.avgConfidence)} />
          <MiniMetric label="Avg Awareness Score" value={fmtScore(d.avgAwareness)} />
        </div>
      </Section>

      {/* Clarity of Time */}
      <Section title="Clarity of Time" icon={FiClock}>
        <p className="text-xs text-muted mb-4">
          Average time estimate before planning (Q3) vs after planning (Q17), across all meetings.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TimeStat label="Before Meeting" value={minutesToLabel(d.avgBefore)} tone="muted" />
          <TimeStat label="After Meeting" value={minutesToLabel(d.avgAfter)} tone="muted" />
          <TimeStat
            label="Difference"
            value={d.avgDiff == null ? '—' : minutesToLabel(d.avgDiff)}
            tone={d.avgDiff == null ? 'muted' : d.avgDiff <= 0 ? 'green' : 'red'}
            icon={d.avgDiff == null ? null : d.avgDiff <= 0 ? FiArrowDownRight : FiArrowUpRight}
          />
        </div>
      </Section>

      {/* Before vs After */}
      <Section title="Before Meeting vs After Meeting" icon={FiActivity}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">Before Meeting</h4>
            <BarRow label="Awareness Rating" value={d.avgAwareness} />
            <BarRow label="Confidence Rating" value={d.avgConfidence} />
            <BarRow label="Success Rating" value={d.avgSuccess} />
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">After Meeting</h4>
            <BarRow label="Planning Experience" value={d.avgPlanning} />
            <div className="pt-1">
              <p className="text-xs font-semibold text-mkink mb-2">Your Learnings: Planned Meeting vs Actual Meeting</p>
              {d.learningKeywords.length ? (
                <ChipList items={d.learningKeywords} tone="green" />
              ) : (
                <p className="text-xs text-muted italic">No learnings recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* AI Insights */}
      <Section title="AI Insights" icon={FiZap}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Realisations</p>
            {d.realisationKeywords.length ? (
              <ChipList items={d.realisationKeywords} tone="red" />
            ) : (
              <p className="text-xs text-muted italic">No realisations captured yet.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Learnings</p>
            {d.learningKeywords.length ? (
              <ChipList items={d.learningKeywords} tone="green" />
            ) : (
              <p className="text-xs text-muted italic">No learnings captured yet.</p>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ========================== Single meeting view ==========================
function SingleMeetingView({ meeting }) {
  const exp = meeting.experience || {};
  const refl = meeting.reflection || {};

  const before = durationToMinutes(meeting.answers?.q3);
  const after = durationToMinutes(meeting.answers?.q17);
  const diff = before != null && after != null ? after - before : null;

  const realisationKeywords = extractKeywords([exp.realisation].filter(Boolean));
  const learningKeywords = extractKeywords([refl.learnings].filter(Boolean));

  const scoreData = [
    { name: 'Awareness', value: typeof exp.awareness === 'number' ? exp.awareness : 0 },
    { name: 'Confidence', value: typeof exp.confidence === 'number' ? exp.confidence : 0 },
    { name: 'Success', value: typeof exp.success === 'number' ? exp.success : 0 },
    { name: 'Planning', value: typeof refl.planningHelpfulness === 'number' ? refl.planningHelpfulness : 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Meeting Information */}
      <Section title="Meeting Information" icon={FiInfo}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoItem label="Meeting Name" value={meeting.title} />
          <InfoItem label="Created Date" value={formatDate(meeting.createdDate)} />
          <div className="bg-surface-alt border border-line rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Current Status</p>
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                statusBadgeStyles[meeting.status] || statusBadgeStyles.Upcoming
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {meeting.status}
            </span>
          </div>
          <InfoItem label="Estimated Time" value={formatEstTime(meeting.estTime)} />
        </div>
      </Section>

      {/* Before vs After */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Before Meeting" icon={FiActivity}>
          <div className="space-y-3">
            <BarRow label="Awareness Rating" value={typeof exp.awareness === 'number' ? exp.awareness : null} />
            <BarRow label="Confidence Rating" value={typeof exp.confidence === 'number' ? exp.confidence : null} />
            <BarRow label="Success Rating" value={typeof exp.success === 'number' ? exp.success : null} />
          </div>
          <div className="pt-4 mt-4 border-t border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Any Other Realisation</p>
            <p className="text-sm text-mkink-soft break-words leading-relaxed whitespace-pre-wrap">
              {exp.realisation ? exp.realisation : <span className="text-muted italic">No realisation provided.</span>}
            </p>
          </div>
        </Section>

        <Section title="After Meeting" icon={FiCheckCircle}>
          <div className="space-y-3">
            <BarRow
              label="Planning Experience Rating"
              value={typeof refl.planningHelpfulness === 'number' ? refl.planningHelpfulness : null}
            />
          </div>
          <div className="pt-4 mt-4 border-t border-line">
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Your Learnings: Planned Meeting vs Actual Meeting</p>
            <p className="text-sm text-mkink-soft break-words leading-relaxed whitespace-pre-wrap">
              {refl.learnings ? (
                refl.learnings
              ) : (
                <span className="text-muted italic">Not completed yet — no learnings recorded.</span>
              )}
            </p>
          </div>
        </Section>
      </div>

      {/* Actual vs Planned (time) */}
      <Section title="Actual vs Planned Meeting" icon={FiTarget}>
        <p className="text-xs text-muted mb-4">
          Initial time estimate (Q3) vs final time estimate (Q17).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TimeStat label="Before (Initial)" value={minutesToLabel(before)} tone="muted" />
          <TimeStat label="After (Final)" value={minutesToLabel(after)} tone="muted" />
          <TimeStat
            label="Difference"
            value={diff == null ? '—' : minutesToLabel(diff)}
            tone={diff == null ? 'muted' : diff <= 0 ? 'green' : 'red'}
            icon={diff == null ? null : diff <= 0 ? FiArrowDownRight : FiArrowUpRight}
          />
        </div>
      </Section>

      {/* Meeting Score Summary (chart + cards) */}
      <Section title="Meeting Score Summary" icon={FiAward}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MiniMetric label="Awareness Score" value={fmtScore(typeof exp.awareness === 'number' ? exp.awareness : null)} />
          <MiniMetric label="Confidence Score" value={fmtScore(typeof exp.confidence === 'number' ? exp.confidence : null)} />
          <MiniMetric label="Success Score" value={fmtScore(typeof exp.success === 'number' ? exp.success : null)} />
          <MiniMetric label="Planning Experience" value={fmtScore(typeof refl.planningHelpfulness === 'number' ? refl.planningHelpfulness : null)} />
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#FEF2F2' }} />
              <Bar dataKey="value" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* AI Insights for this meeting */}
      <Section title="AI Insights" icon={FiZap}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Realisations</p>
            {realisationKeywords.length ? (
              <ChipList items={realisationKeywords} tone="red" />
            ) : (
              <p className="text-xs text-muted italic">No realisation keywords for this meeting.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Learnings</p>
            {learningKeywords.length ? (
              <ChipList items={learningKeywords} tone="green" />
            ) : (
              <p className="text-xs text-muted italic">No learning keywords for this meeting.</p>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

// ================================ Shared ================================
function EmptyState({ onPlan }) {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-line bg-surface rounded-2xl shadow-card">
      <FiBarChart2 className="text-5xl text-brand-red mb-4" />
      <h3 className="text-lg font-bold text-mkink mb-2">No data yet</h3>
      <p className="text-muted text-xs max-w-sm mb-6">
        Plan and assign a few meetings to see insights, ratings, and trends here.
      </p>
      <button
        onClick={onPlan}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand-red text-white text-xs font-bold uppercase rounded-lg hover:bg-brand-red-dark transition-colors"
      >
        <FiPlusCircle /> Plan a Meeting
      </button>
    </div>
  );
}

const ACCENTS = {
  ink: 'text-mkink bg-surface-alt',
  blue: 'text-blue-700 bg-blue-50',
  green: 'text-emerald-700 bg-emerald-50',
  red: 'text-brand-red bg-brand-red-tint',
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-surface border border-line rounded-2xl shadow-card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${ACCENTS[accent]}`}>
        <Icon className="text-xl" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-mkink leading-none">{value}</p>
        <p className="text-xs text-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-surface border border-line rounded-2xl shadow-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="text-brand-red" />}
        <h3 className="text-base font-bold text-mkink">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="bg-surface-alt border border-line rounded-xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">{label}</p>
      <p className="text-sm font-bold text-mkink break-words">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="bg-surface-alt border border-line rounded-xl p-4 text-center">
      <p className="text-xl font-extrabold text-brand-red">{value}</p>
      <p className="text-[11px] text-muted mt-1 leading-tight">{label}</p>
    </div>
  );
}

function TimeStat({ label, value, tone, icon: Icon }) {
  const toneClass =
    tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-brand-red' : 'text-mkink';
  return (
    <div className="bg-surface-alt border border-line rounded-xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className={`text-base font-bold flex items-center gap-1.5 ${toneClass}`}>
        {Icon && <Icon className="text-sm" />}
        {value}
      </p>
    </div>
  );
}

function BarRow({ label, value }) {
  const pct = value == null ? 0 : (value / 5) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-mkink">{label}</span>
        <span className="font-bold text-brand-red">{value == null ? '—' : `${value.toFixed(1)}/5`}</span>
      </div>
      <div className="h-2 w-full bg-line-soft rounded-full overflow-hidden">
        <div className="h-full bg-brand-red rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ChipList({ items, tone }) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-brand-red-tint text-brand-red border-brand-red/30';
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${toneClass}`}
        >
          {it.label}
          <span className="text-[10px] font-bold opacity-70">{it.count}</span>
        </span>
      ))}
    </div>
  );
}
