import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiUsers, FiSearch, FiChevronRight, FiClipboard, FiFileText, FiActivity,
} from 'react-icons/fi';
import { Card, Badge, Avatar, Button, Spinner, PageHeader, Tabs, Input } from '@/components/ui';
import FormsViewer from '@/components/features/FormsViewer.jsx';
import * as consultantService from '@/services/consultantService';

const DETAIL_TABS = [
  { id: 'overview', label: 'Overview', icon: FiUsers },
  { id: 'tasks',    label: 'Tasks',    icon: FiClipboard },
  { id: 'forms',    label: 'Forms',    icon: FiFileText },
  { id: 'reports',  label: 'Reports',  icon: FiActivity },
];

const taskTone = { Completed: 'success', 'In Progress': 'warning', Pending: 'default' };

/**
 * Consultant → Participants. Replaces the old "Consultant Panel" sidebar
 * entry. Shows each assigned client's task stats and lets the consultant
 * drill into their details and submitted forms (read-only here — task
 * management lives on the legacy /consultant page).
 */
export default function Participants() {
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const openClient = (c) => navigate(`/dashboard?client=${encodeURIComponent(c.id)}`);

  useEffect(() => {
    consultantService.getMyClients().then((d) => {
      setClients(d.clients);
      setSelected(d.clients[0] || null);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.clientId?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  if (!clients) {
    return <div className="grid h-[60vh] place-items-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <Button as={Link} to="/dashboard" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader title="Participants" subtitle="Your assigned clients.">
        <Badge tone="brand" dot>{clients.length} assigned</Badge>
      </PageHeader>

      {/* Search */}
      <div className="relative">
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search participants…"
          className="input-base pl-10"
        />
      </div>

      {/* Summary table */}
      <Card title="Participants overview">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">No participants match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-700 text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Client ID</th>
                  <th className="px-3 py-2 font-semibold">Last activity</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const last = c.lastActivity || c.date || '—';
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer border-b border-ink-800 transition-colors hover:bg-ink-800/40"
                      onClick={() => openClient(c)}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size={32} />
                          <p className="truncate font-medium text-slate-200">{c.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-300">{c.clientId || '—'}</td>
                      <td className="px-3 py-3 text-ink-400">{last}</td>
                      <td className="px-3 py-3 text-right">
                        <FiChevronRight className="inline h-4 w-4 text-ink-500" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && <ParticipantDetail key={selected.id} client={selected} />}
    </div>
  );
}

function ParticipantDetail({ client }) {
  const [tab, setTab] = useState('overview');
  const [tasks, setTasks] = useState(null);
  const [forms, setForms] = useState(null);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    setTasks(null); setForms(null); setReports(null); setTab('overview');
  }, [client.id]);

  useEffect(() => {
    if (tab === 'tasks' && tasks === null)
      consultantService.getTasks(client.id).then((d) => setTasks(d.tasks)).catch(() => setTasks([]));
    if (tab === 'forms' && forms === null)
      consultantService.getClientForms(client.id).then((d) => setForms(d.forms)).catch(() => setForms([]));
    if (tab === 'reports' && reports === null)
      consultantService.getClientReports(client.id).then((d) => setReports(d.reports)).catch(() => setReports([]));
  }, [tab, client.id, tasks, forms, reports]);

  const total = client.tasks?.total ?? 0;
  const done = client.tasks?.done ?? 0;
  const pending = Math.max(0, total - done);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card
        title={<span className="flex items-center gap-2"><Avatar name={client.name} size={28} /> {client.name}</span>}
        subtitle={`${client.clientId || ''}${client.dept ? ' · ' + client.dept : ''}`}
      >
        <Tabs tabs={DETAIL_TABS} active={tab} onChange={setTab} className="mb-4" />

        {tab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Assigned" value={total} tone="brand" />
            <Stat label="Completed" value={done} tone="success" />
            <Stat label="Pending" value={pending} tone="warning" />
            <Stat label="Completion" value={`${pct}%`} tone="info" />
          </div>
        )}

        {tab === 'tasks' && (
          tasks === null ? (
            <div className="grid h-24 place-items-center"><Spinner size={24} /></div>
          ) : tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No tasks for this participant.</p>
          ) : (
            <ul className="space-y-2.5">
              {tasks.map((t) => (
                <li key={t._id} className="rounded-xl border border-ink-700 bg-ink-900/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-200">{t.title}</p>
                      {t.dueDate && <p className="text-xs text-ink-500">Due {new Date(t.dueDate).toLocaleDateString()}</p>}
                    </div>
                    <Badge tone={taskTone[t.status] || 'default'} dot>{t.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-ink-400">{t.progress}%</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'forms' && (
          forms === null
            ? <div className="grid h-24 place-items-center"><Spinner size={24} /></div>
            : <FormsViewer forms={forms} />
        )}

        {tab === 'reports' && (
          reports === null ? (
            <div className="grid h-24 place-items-center"><Spinner size={24} /></div>
          ) : reports.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No reports for this participant yet.</p>
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
      </Card>
    </motion.div>
  );
}

function Stat({ label, value, tone = 'brand' }) {
  const tones = {
    brand: 'text-brand-300',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    info: 'text-sky-300',
  };
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
      <p className="text-xs uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tones[tone] || tones.brand}`}>{value}</p>
    </div>
  );
}
