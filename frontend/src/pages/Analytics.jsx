import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiClock, FiZap, FiActivity, FiTrendingUp,
  FiBarChart2, FiAward, FiUsers, FiBriefcase, FiGrid,
  FiCheckCircle, FiClipboard,
} from 'react-icons/fi';
import { Card, StatCard, Badge, PageHeader, Input, Avatar, Tabs, Spinner, BackButton } from '@/components/ui';
import { statusTone } from '@/components/ui/Badge.jsx';
import ProductivityTrend from '@/components/charts/ProductivityTrend.jsx';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import DonutChart from '@/components/charts/DonutChart.jsx';
import { buildAnalytics } from '@/data/analyticsMock';
import { buildRealAnalytics, filterByRange } from '@/utils/taAnalytics';
import { listAssessments } from '@/services/taService';
import { useAuthContext } from '@/context/AuthContext.jsx';
import { getClients, getConsultants, getConsultantOverview } from '@/services/adminService';
import { formatMinutes } from '@/utils/format';
import { cn } from '@/utils/cn';

const RANGES = [
  { id: 'latest', label: 'Latest', days: 1 },
  { id: '3d', label: 'Last 3 Days', days: 3 },
  { id: '5d', label: 'Last 5 Days', days: 5 },
  { id: '10d', label: 'Last 10 Days', days: 10 },
  { id: 'all', label: 'All', days: 365 },
];

const FOCUS_TABS = [
  { id: 'clients', label: 'Clients', icon: FiUsers },
  { id: 'consultants', label: 'Consultants', icon: FiBriefcase },
];

export default function Analytics() {
  const { isAdmin } = useAuthContext();
  const [rangeId, setRangeId] = useState('latest');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // Admin-only: which person's analytics are we viewing? null = org-wide.
  const [focusGroup, setFocusGroup] = useState('clients');
  const [focusedUser, setFocusedUser] = useState(null);
  const [clientsList, setClientsList] = useState(null);
  const [consultantsList, setConsultantsList] = useState(null);

  // Fetch the two lists once when an admin opens the page.
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    getClients({ status: 'All' }).then((d) => active && setClientsList(d.clients || []));
    getConsultants().then((d) => active && setConsultantsList(d.consultants || []));
    return () => { active = false; };
  }, [isAdmin]);

  // Deep-link support: /analytics?focus=complete|top3 scrolls to a section.
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const focus = searchParams.get('focus');
    if (focus !== 'complete' && focus !== 'top3') return;
    const id = focus === 'top3' ? 'top3-productive' : 'complete-analysis';
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    return () => clearTimeout(t);
  }, [searchParams]);

  // Resolve the active number of days: an explicit date range overrides the quick buttons.
  const days = useMemo(() => {
    if (start && end) {
      const diff = Math.ceil((new Date(end) - new Date(start)) / 86400000);
      if (diff > 0) return Math.min(diff, 365);
    }
    return RANGES.find((r) => r.id === rangeId)?.days ?? 1;
  }, [rangeId, start, end]);

  const customActive = Boolean(start && end);

  // ── CLIENT: real analytics from the user's own saved assessments ──────────
  // (admin still uses the seeded demo generator until admin data-views are wired)
  const [myAssessments, setMyAssessments] = useState(null); // null = loading
  useEffect(() => {
    if (isAdmin) return;
    let active = true;
    listAssessments()
      .then((list) => active && setMyAssessments(list))
      .catch(() => active && setMyAssessments([]));
    return () => { active = false; };
  }, [isAdmin]);

  const seed = isAdmin && focusedUser ? `${focusedUser.role}:${focusedUser.id}` : null;
  const data = useMemo(() => {
    if (isAdmin) return buildAnalytics(days, seed);
    const filtered = filterByRange(myAssessments || [], {
      latestOnly: !customActive && rangeId === 'latest',
      days,
      start: customActive ? start : null,
      end: customActive ? end : null,
    });
    return buildRealAnalytics(filtered);
  }, [isAdmin, days, seed, myAssessments, rangeId, start, end, customActive]);

  // Client still loading their data from the database.
  if (!isAdmin && myAssessments === null) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  const focusList = focusGroup === 'consultants' ? consultantsList : clientsList;

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader
        title="Analytics"
        subtitle={
          isAdmin
            ? focusedUser
              ? `Viewing ${focusedUser.role === 'consultant' ? 'consultant' : 'client'} · ${focusedUser.name}`
              : 'Org-wide analytics — pick a person below to drill in'
            : 'Complete productivity analysis & insights'
        }
      >
        {isAdmin && focusedUser && (
          <Badge tone="brand" dot>
            {focusedUser.role === 'consultant' ? 'Consultant' : 'Client'}: {focusedUser.name}
          </Badge>
        )}
      </PageHeader>

      {/* ---- ADMIN ONLY: pick a client or consultant ---------------------- */}
      {isAdmin && (
        <Card
          title={<span className="flex items-center gap-2"><FiUsers className="text-brand-400" /> View analytics for</span>}
          subtitle="Click a person to scope the dashboards below to them"
          action={
            <button
              onClick={() => setFocusedUser(null)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                focusedUser === null
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                  : 'border-ink-700 text-ink-400 hover:border-brand-500 hover:text-brand-400'
              )}
            >
              <FiGrid className="h-4 w-4" /> Org-wide
            </button>
          }
        >
          <Tabs tabs={FOCUS_TABS} active={focusGroup} onChange={setFocusGroup} className="mb-4" />

          {focusList === null ? (
            <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
          ) : focusList.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No {focusGroup} yet.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {focusList.map((u) => {
                const role = focusGroup === 'consultants' ? 'consultant' : 'client';
                const active = focusedUser?.id === u.id && focusedUser?.role === role;
                const subtitle =
                  role === 'consultant'
                    ? `${u.assignedCount ?? 0} client${u.assignedCount === 1 ? '' : 's'}`
                    : `${u.clientId || '—'} · ${u.dept || u.status}`;
                return (
                  <button
                    key={u.id}
                    onClick={() => setFocusedUser({ id: u.id, name: u.name, role })}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'border-brand-500/40 bg-brand-500/10'
                        : 'border-ink-700 bg-ink-900/40 hover:border-brand-500/40 hover:bg-ink-800'
                    )}
                  >
                    <Avatar name={u.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{u.name}</p>
                      <p className="truncate text-xs text-ink-500">{subtitle}</p>
                    </div>
                    {active && <Badge tone="brand">Selected</Badge>}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* When admin has a consultant focused, swap the productivity charts for
          a consultant-shaped overview (clients, tasks, completion rate). */}
      {isAdmin && focusedUser?.role === 'consultant' ? (
        <ConsultantOverviewSection consultantId={focusedUser.id} />
      ) : (
        <>
      {/* ---- Controls: range filter + date range -------------------------- */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-fg-muted">Quick Range</p>
            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-800 p-1">
              {RANGES.map((r) => {
                const active = !customActive && r.id === rangeId;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRangeId(r.id);
                      setStart('');
                      setEnd('');
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active ? 'bg-brand-gradient text-white shadow' : 'text-ink-400 hover:text-fg'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input label="Start Period" type="date" value={start} onChange={(e) => setStart(e.target.value)} className="sm:w-44" />
            <Input label="End Period" type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="sm:w-44" />
          </div>
        </div>
      </Card>

      {/* No data yet (client) — explain instead of showing empty charts. */}
      {!isAdmin && data.count === 0 && (
        <Card>
          <p className="py-4 text-center text-sm text-ink-400">
            No assessment data {myAssessments?.length ? 'in this range' : 'yet'} — complete a Time Auditor
            assessment and your analytics will build from it automatically.
          </p>
        </Card>
      )}

      {/* ---- SECTION 1: Top 3 Productive (moved up) ---------------------- */}
        <motion.section id="top3-productive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-24 space-y-5">
          <SectionHeader icon={FiAward} title="Top 3 Productive" subtitle="Highest-impact modules, sections and hours" />

          <div className="grid gap-5 lg:grid-cols-3">
            <Card title={<span className="flex items-center gap-2"><FiClock className="text-brand-400" /> Total Hours</span>} className="flex flex-col justify-center">
              <p className="text-3xl font-bold text-fg-strong">{formatMinutes(data.totalTracked)}</p>
              <p className="mt-1 text-sm text-ink-400">Total time logged in this range.</p>
            </Card>

            <Card title={<span className="flex items-center gap-2"><FiZap className="text-brand-400" /> Productive</span>} className="flex flex-col justify-center">
              <p className="text-3xl font-bold text-fg-strong">{formatMinutes(data.productiveMin)}</p>
              <p className="mt-1 text-sm text-ink-400">Hours spent on productive work.</p>
            </Card>

            <Card title={<span className="flex items-center gap-2"><FiTrendingUp className="text-brand-400" /> Top active periods</span>}>
              <ul className="space-y-3">
                {data.topPeriods.map((p, i) => (
                  <li key={p.range}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-fg-muted">{i + 1}. {p.range}</span>
                      <span className="font-medium text-fg">{p.pct}%</span>
                    </div>
                    <Bar pct={p.pct} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>

        </motion.section>

      {/* ---- SECTION 2: Complete Analysis (moved down) ------------------- */}
      <motion.section id="complete-analysis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-24 space-y-5">
          <SectionHeader icon={FiBarChart2} title="Complete Analysis" subtitle="Everything about how your time was spent" />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={FiClock} label="Planned Hours" value={formatMinutes(data.plannedMin)} tone="info" />
            <StatCard icon={FiZap} label="Productive Hours" value={formatMinutes(data.productiveMin)} tone="success" />
            <StatCard icon={FiActivity} label="Unproductive Hours" value={formatMinutes(data.unproductiveMin)} tone="danger" />
          </div>

          <Card title="Productivity trend" subtitle="Daily productivity with average line">
            <ProductivityTrend data={data.trend} average={data.avgProductivity} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Daily productivity" subtitle="This week, by day">
              <BarChartCard data={data.daily} color="#f93b48" unit="%" average xLabel="Day" yLabel="Productivity (%)" />
            </Card>
            <Card title="Weekly productivity" subtitle="Across the selected range">
              <BarChartCard data={data.weekly} color="#e51d2b" unit="%" average xLabel="Week" yLabel="Productivity (%)" />
            </Card>
          </div>

        </motion.section>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin → consultant drill-down: a consultant doesn't have a "time-spent"   */
/*  story, so we render an operations-style overview instead.                 */
/* -------------------------------------------------------------------------- */
function ConsultantOverviewSection({ consultantId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    setData(null);
    getConsultantOverview(consultantId).then((d) => active && setData(d));
    return () => { active = false; };
  }, [consultantId]);

  if (!data) {
    return <div className="grid h-40 place-items-center"><Spinner size={28} /></div>;
  }

  const { consultant, stats, taskBreakdown, clients } = data;
  const donutData = withTaskColors(taskBreakdown);

  return (
    <section className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiUsers} label="Assigned clients" value={stats.clients} tone="brand" />
        <StatCard icon={FiClipboard} label="Total tasks" value={stats.tasks} tone="info" />
        <StatCard icon={FiCheckCircle} label="Completion rate" value={`${stats.completionRate}%`} tone="success" />
        <StatCard icon={FiTrendingUp} label="Avg. progress" value={`${stats.avgProgress}%`} tone="warning" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Task breakdown" subtitle="Across all assigned clients">
          <DonutChart data={donutData} unit="" centerValue={stats.tasks} centerLabel="Tasks" />
          <div className="mt-4 space-y-2">
            {donutData.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-ink-400">{c.name}</span>
                <span className="ml-auto font-medium text-fg">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title={<span className="flex items-center gap-2"><FiBriefcase className="text-brand-400" /> Consultant</span>}
          subtitle={consultant?.title || 'Consultant'}
          className="lg:col-span-2"
        >
          <div className="flex items-center gap-4">
            <Avatar name={consultant?.name} size={56} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-fg-strong">{consultant?.name || '—'}</p>
              <p className="truncate text-sm text-ink-400">{consultant?.email || '—'}</p>
              {consultant?.department && (
                <p className="mt-1 text-xs text-ink-500">{consultant.department}</p>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Stat label="Clients" value={stats.clients} />
            <Stat label="Tasks" value={stats.tasks} />
            <Stat label="Completed" value={stats.completed} />
          </div>
        </Card>
      </div>

      <Card
        title={<span className="flex items-center gap-2"><FiUsers className="text-brand-400" /> Assigned clients</span>}
        subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'} under this consultant`}
      >
        {clients.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No clients assigned to this consultant yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-ink-400">
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Tasks</th>
                  <th className="pb-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                          <p className="truncate text-xs text-ink-500">{c.clientId || '—'} · {c.dept || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3"><Badge tone={statusTone[c.status] || 'default'} dot>{c.status}</Badge></td>
                    <td className="py-3 text-ink-300">{c.tasks.done}/{c.tasks.total}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-700">
                          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${c.progress}%` }} />
                        </div>
                        <span className="w-9 text-right text-xs text-ink-400">{c.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 px-3 py-2">
      <p className="text-lg font-semibold text-fg-strong">{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

function withTaskColors(breakdown) {
  const colors = { Completed: '#e51d2b', 'In Progress': '#a1a1aa', Pending: '#64748b' };
  return (breakdown || []).map((b) => ({ ...b, color: colors[b.name] || '#f93b48' }));
}

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold text-fg-strong">{title}</h2>
        <p className="text-sm text-ink-400">{subtitle}</p>
      </div>
    </div>
  );
}

function Bar({ pct, color = '#f93b48' }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  );
}

