import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiUsers, FiCheckCircle, FiTrendingUp, FiClipboard, FiFileText, FiPlus, FiTrash2,
  FiAlertTriangle, FiBriefcase, FiChevronRight, FiActivity, FiPieChart, FiClock,
  FiPauseCircle, FiZap, FiMonitor, FiCheck, FiX, FiUserCheck, FiHash,
} from 'react-icons/fi';
import { Card, StatCard, Badge, Avatar, Button, Spinner, PageHeader, Tabs, Modal, Input, BackButton } from '@/components/ui';
import { statusTone } from '@/components/ui/Badge.jsx';
import DonutChart from '@/components/charts/DonutChart.jsx';
import ProductivityTrend from '@/components/charts/ProductivityTrend.jsx';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import Heatmap from '@/components/charts/Heatmap.jsx';
import FormsViewer from '@/components/features/FormsViewer.jsx';
import * as consultantService from '@/services/consultantService';
import { buildAnalytics } from '@/data/analyticsMock';
import { useToast } from '@/context/ToastContext.jsx';
import { formatMinutes } from '@/utils/format';
import { cn } from '@/utils/cn';

const DETAIL_TABS = [
  { id: 'tasks', label: 'Tasks', icon: FiClipboard },
  { id: 'forms', label: 'Forms', icon: FiFileText },
  { id: 'reports', label: 'Reports', icon: FiActivity },
  { id: 'analytics', label: 'Analytics', icon: FiPieChart },
];

const ANALYTICS_RANGES = [
  { id: 'latest', label: 'Latest', days: 1 },
  { id: '3d', label: 'Last 3 Days', days: 3 },
  { id: '5d', label: 'Last 5 Days', days: 5 },
  { id: '10d', label: 'Last 10 Days', days: 10 },
];

const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const PROGRESS_STEPS = [0, 25, 50, 75, 100];
const taskTone = { Completed: 'success', 'In Progress': 'warning', Pending: 'default' };

export default function Consultant() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [clients, setClients] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Allow other pages to deep-link to a specific client via /participants?client=<id>.
  const [searchParams] = useSearchParams();
  const preselectId = searchParams.get('client');

  useEffect(() => {
    consultantService.getAnalytics().then(setAnalytics);
    consultantService.getMyClients().then((d) => {
      setClients(d.clients);
      const target = preselectId && d.clients.find((c) => c.id === preselectId);
      setSelected(target || d.clients[0] || null);
    });
  }, [preselectId]);

  async function refreshClients() {
    const [a, c] = await Promise.all([consultantService.getAnalytics(), consultantService.getMyClients()]);
    setAnalytics(a);
    setClients(c.clients);
  }

  async function removeClient(client) {
    await consultantService.deleteClient(client.id);
    setClients((list) => list.filter((c) => c.id !== client.id));
    setSelected((cur) => (cur?.id === client.id ? null : cur));
    setConfirmDelete(null);
    consultantService.getAnalytics().then(setAnalytics);
    toast.info(`${client.name} removed`);
  }

  async function decideClient(client, status) {
    try {
      await consultantService.setClientStatus(client.id, status);
      setClients((list) =>
        list ? list.map((c) => (c.id === client.id ? { ...c, status } : c)) : list
      );
      toast[status === 'Approved' ? 'success' : 'info'](
        `${client.name} ${status.toLowerCase()} · ${client.clientId}`
      );
    } catch (err) {
      toast.error(err?.message || `Could not ${status.toLowerCase()} client.`);
    }
  }

  const pendingClients = (clients || []).filter((c) => c.status === 'Pending');

  if (!clients || !analytics) {
    return <div className="grid h-[60vh] place-items-center"><Spinner size={32} /></div>;
  }

  const s = analytics.stats;

  return (
    <div className="space-y-6">
      <BackButton to="/participants" />
      <PageHeader title="Consultant Panel" subtitle="Your assigned clients, tasks & performance">
        <Badge tone="brand" dot>Consultant access</Badge>
      </PageHeader>

      {/* Performance / analytics */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiUsers} label="Assigned clients" value={s.clients} tone="brand" />
        <StatCard icon={FiClipboard} label="Total tasks" value={s.tasks} tone="info" />
        <StatCard icon={FiCheckCircle} label="Completion rate" value={`${s.completionRate}%`} tone="success" />
        <StatCard icon={FiTrendingUp} label="Avg. progress" value={`${s.avgProgress}%`} tone="warning" />
      </div>

      {pendingClients.length > 0 && (
        <Card
          title={<span className="flex items-center gap-2"><FiUserCheck className="text-brand-400" /> Approvals</span>}
          subtitle="Clients assigned to you awaiting your approval"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-left text-ink-400">
                  <th className="pb-3 font-medium">Client</th>
                  <th className="pb-3 font-medium">Client ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {pendingClients.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size={36} />
                        <div>
                          <p className="font-medium text-slate-200">{c.name}</p>
                          <p className="text-xs text-ink-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-300">
                        <FiHash className="h-3 w-3" />{c.clientId}
                      </span>
                    </td>
                    <td className="py-3"><Badge tone={statusTone[c.status] || 'default'} dot>{c.status}</Badge></td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="subtle" icon={FiCheck} onClick={() => decideClient(c, 'Approved')}>Approve</Button>
                        <button
                          onClick={() => decideClient(c, 'Rejected')}
                          aria-label="Reject"
                          title="Reject"
                          className="rounded-lg border border-ink-600 p-2 text-ink-400 transition-colors hover:border-unproductive hover:text-unproductive"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Assigned clients list */}
        <Card title="My clients" subtitle={`${clients.length} assigned`} className="lg:col-span-1">
          {clients.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No clients assigned to you yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {clients.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                      selected?.id === c.id ? 'border-brand-500/40 bg-brand-500/10' : 'border-transparent hover:bg-ink-800'
                    )}
                  >
                    <Avatar name={c.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{c.name}</p>
                      <p className="truncate font-mono text-xs text-ink-500">{c.clientId || '—'}</p>
                    </div>
                    <FiChevronRight className="h-4 w-4 shrink-0 text-ink-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-ink-700 pt-4">
            <Card className="!p-0 !border-0 !bg-transparent">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Task breakdown</p>
              <DonutChart data={withColors(analytics.taskBreakdown)} unit="" centerValue={s.tasks} centerLabel="Tasks" />
            </Card>
          </div>
        </Card>

        {/* Selected client detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <ClientDetail
              key={selected.id}
              client={selected}
              onChanged={refreshClients}
              onDeleteClient={() => setConfirmDelete(selected)}
            />
          ) : (
            <Card><p className="py-16 text-center text-sm text-ink-400">Select a client to view their forms, reports and tasks.</p></Card>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Remove client"
        subtitle="This deletes the client and all their forms & tasks. This cannot be undone."
        icon={FiAlertTriangle}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => removeClient(confirmDelete)}>Remove client</Button>
          </>
        }
      >
        <p className="text-sm text-ink-300">Remove <span className="font-medium text-white">{confirmDelete?.name}</span>?</p>
      </Modal>
    </div>
  );
}

function ClientDetail({ client, onChanged, onDeleteClient }) {
  const toast = useToast();
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState(null);
  const [forms, setForms] = useState(null);
  const [reports, setReports] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setTasks(null); setForms(null); setReports(null); setTab('tasks');
    consultantService.getTasks(client.id).then((d) => setTasks(d.tasks));
  }, [client.id]);

  // Lazy-load forms/reports when their tab is first opened.
  useEffect(() => {
    if (tab === 'forms' && forms === null) consultantService.getClientForms(client.id).then((d) => setForms(d.forms));
    if (tab === 'reports' && reports === null) consultantService.getClientReports(client.id).then((d) => setReports(d.reports));
  }, [tab, client.id, forms, reports]);

  async function addTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) { toast.error('Task title is required.'); return; }
    setAdding(true);
    try {
      const { task } = await consultantService.createTask(client.id, { title: newTitle.trim(), dueDate: newDue || null });
      setTasks((t) => [task, ...(t || [])]);
      setNewTitle(''); setNewDue('');
      toast.success('Task added');
      onChanged?.();
    } finally {
      setAdding(false);
    }
  }

  async function patchTask(taskId, patch) {
    const { task } = await consultantService.updateTask(taskId, patch);
    setTasks((list) => list.map((t) => (t._id === taskId ? task : t)));
    onChanged?.();
  }

  async function removeTask(taskId) {
    await consultantService.deleteTask(taskId);
    setTasks((list) => list.filter((t) => t._id !== taskId));
    toast.info('Task deleted');
    onChanged?.();
  }

  return (
    <Card
      title={<span className="flex items-center gap-2"><FiBriefcase className="text-brand-400" />{client.name}</span>}
      subtitle={`${client.clientId} · ${client.dept}`}
      action={<Button size="sm" variant="ghost" icon={FiTrash2} onClick={onDeleteClient} className="!text-ink-400 hover:!text-unproductive">Remove</Button>}
    >
      <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} className="mb-4" />

      {/* TASKS */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <form onSubmit={addTask} className="flex flex-wrap items-end gap-2">
            <Input label="New task" name="title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Complete weekly time audit" className="min-w-[200px] flex-1" />
            <Input label="Due" name="due" type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-40" />
            <Button type="submit" icon={FiPlus} loading={adding}>Add</Button>
          </form>

          {tasks === null ? (
            <div className="grid h-24 place-items-center"><Spinner size={24} /></div>
          ) : tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No tasks yet. Add the first one above.</p>
          ) : (
            <ul className="space-y-2.5">
              {tasks.map((t) => (
                <li key={t._id} className="rounded-xl border border-ink-700 bg-ink-900/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200">{t.title}</p>
                      {t.dueDate && <p className="text-xs text-ink-500">Due {new Date(t.dueDate).toLocaleDateString()}</p>}
                    </div>
                    <button onClick={() => removeTask(t._id)} aria-label="Delete task" className="rounded-lg p-1.5 text-ink-400 hover:bg-unproductive/10 hover:text-unproductive">
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Badge tone={taskTone[t.status]} dot>{t.status}</Badge>
                    <label className="flex items-center gap-1.5 text-xs text-ink-400">
                      Status
                      <select value={t.status} onChange={(e) => patchTask(t._id, { status: e.target.value })} className="input-base h-8 py-0 text-xs">
                        {TASK_STATUSES.map((st) => <option key={st} value={st} className="bg-ink-800">{st}</option>)}
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-ink-400">
                      Progress
                      <select value={nearestStep(t.progress)} onChange={(e) => patchTask(t._id, { progress: Number(e.target.value) })} className="input-base h-8 py-0 text-xs">
                        {PROGRESS_STEPS.map((p) => <option key={p} value={p} className="bg-ink-800">{p}%</option>)}
                      </select>
                    </label>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-700">
                        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${t.progress}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs text-ink-400">{t.progress}%</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* FORMS */}
      {tab === 'forms' && (
        forms === null ? <div className="grid h-24 place-items-center"><Spinner size={24} /></div> : <FormsViewer forms={forms} />
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        reports === null ? (
          <div className="grid h-24 place-items-center"><Spinner size={24} /></div>
        ) : reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">No reports for this client yet.</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {reports.map((r) => (
              <li key={r._id} className="flex items-center gap-3 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-400"><FiActivity className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">{r.name}</p>
                  <p className="truncate text-xs text-ink-500">{r.range || r.type}</p>
                </div>
                <Badge tone="default">{r.format}</Badge>
              </li>
            ))}
          </ul>
        )
      )}

      {/* ANALYTICS */}
      {tab === 'analytics' && <ClientAnalytics client={client} />}
    </Card>
  );
}

function ClientAnalytics({ client }) {
  const [rangeId, setRangeId] = useState('latest');
  const days = ANALYTICS_RANGES.find((r) => r.id === rangeId)?.days ?? 1;
  // Seed by client id so the participant's analytics stay stable across re-renders.
  const data = useMemo(() => buildAnalytics(days, `client:${client.id}`), [days, client.id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200">{client.name}'s analytics</p>
          <p className="text-xs text-ink-500">Productivity, time use & top apps for the selected window</p>
        </div>
        <div className="inline-flex rounded-xl bg-ink-800 p-1">
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRangeId(r.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                rangeId === r.id ? 'bg-brand-gradient text-white shadow' : 'text-ink-400 hover:text-slate-200'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiClock} label="Productive time" value={formatMinutes(data.totalProductive)} tone="success" />
        <StatCard icon={FiPauseCircle} label="Idle time" value={formatMinutes(data.idleTime)} tone="warning" />
        <StatCard icon={FiZap} label="Score" value={`${data.productivityScore}/100`} tone="brand" />
        <StatCard icon={FiActivity} label="Productive %" value={`${data.productivePercent}%`} tone="info" />
      </div>

      <Card title="Productivity trend" subtitle="Daily productivity with average">
        <ProductivityTrend data={data.trend} average={data.avgProductivity} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Daily productivity" subtitle="By weekday">
          <BarChartCard data={data.daily} color="#f93b48" unit="%" average xLabel="Day" yLabel="Productivity (%)" />
        </Card>
        <Card title="Time category breakdown" subtitle="Where time went">
          <DonutChart data={data.categoryBreakdown} centerValue={formatMinutes(data.totalTracked)} centerLabel="Total" />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><FiMonitor className="text-brand-400" /> Most used modules</span>}>
          <MiniBarList items={data.apps.slice(0, 6)} render={formatMinutes} />
        </Card>
        <Card title={<span className="flex items-center gap-2"><FiFileText className="text-brand-400" /> Most visited sections</span>}>
          <MiniBarList items={data.websites.slice(0, 6)} render={formatMinutes} />
        </Card>
      </div>

      <Card title={<span className="flex items-center gap-2"><FiActivity className="text-brand-400" /> Heatmap</span>} subtitle="Productivity by weekday & hour">
        <Heatmap data={data.heatmap} />
      </Card>
    </div>
  );
}

function MiniBarList({ items, render }) {
  const max = Math.max(...items.map((i) => i.minutes), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-slate-300">{item.name}</span>
            <span className="text-ink-400">{render(item.minutes)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
            <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(item.minutes / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Map a raw progress value (0–100) to the closest preset step for the select.
function nearestStep(p) {
  return PROGRESS_STEPS.reduce((best, step) => (Math.abs(step - p) < Math.abs(best - p) ? step : best), 0);
}

// Attach theme colours to the task-breakdown donut slices.
function withColors(breakdown) {
  const colors = { Completed: '#22c55e', 'In Progress': '#f59e0b', Pending: '#64748b' };
  return breakdown.map((b) => ({ ...b, color: colors[b.name] || '#f93b48' }));
}
