import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck, FiX, FiSearch, FiHash,
  FiFileText, FiBriefcase, FiUserPlus, FiArrowRight,
  FiUserCheck, FiUsers,
} from 'react-icons/fi';
import { Card, Badge, Avatar, Button, Spinner, PageHeader, Tabs, Modal, Input, BackButton } from '@/components/ui';
import FormsViewer from '@/components/features/FormsViewer.jsx';
import {
  getAdminOverview, getClients, getConsultants,
  createConsultant, setUserStatus, assignClient, getClientForms,
} from '@/services/adminService';
import { useToast } from '@/context/ToastContext.jsx';
import { titleCaseName } from '@/utils/format';
import { cn } from '@/utils/cn';

const VIEWS = [
  { id: 'approvals', label: 'Approvals', icon: FiUserCheck },
  { id: 'consultants', label: 'Consultants', icon: FiBriefcase },
  { id: 'clients', label: 'Clients', icon: FiUsers },
];

const logTone = { success: 'bg-productive', danger: 'bg-unproductive', info: 'bg-sky-400' };

export default function Admin() {
  const toast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState('approvals');
  const [overview, setOverview] = useState(null);
  const [consultants, setConsultants] = useState([]);

  // Clients/approvals state (one list — Approvals filters to pending below).
  const [clients, setClients] = useState(null);
  const [query, setQuery] = useState('');

  // Modals
  const [formsModal, setFormsModal] = useState(null); // { client, forms } | 'loading'
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    getAdminOverview().then(setOverview);
    getConsultants().then((d) => setConsultants(d.consultants));
  }, []);

  // Load clients whenever Approvals or Clients is the active view.
  useEffect(() => {
    if (view !== 'approvals' && view !== 'clients') return;
    let active = true;
    setClients(null);
    getClients({ status: 'All', q: query }).then((d) => active && setClients(d.clients));
    return () => { active = false; };
  }, [view, query]);

  const consultantOptions = useMemo(
    () => [{ value: '', label: 'Unassigned' }, ...consultants.map((c) => ({ value: c.id, label: c.name }))],
    [consultants]
  );

  function patchClient(id, patch) {
    setClients((list) => (list ? list.map((c) => (c.id === id ? { ...c, ...patch } : c)) : list));
  }

  async function changeStatus(client, status) {
    await setUserStatus(client.id, status);
    patchClient(client.id, { status });
    // Reflect counts in the overview stat cards too.
    getAdminOverview().then(setOverview);
    toast[status === 'Approved' ? 'success' : 'info'](
      `${client.name} ${status.toLowerCase()} · ${client.clientId}` +
        (status === 'Approved' ? ' — confirmation email sent' : status === 'Rejected' ? ' — rejection email sent' : '')
    );
  }

  async function assign(client, consultantId) {
    const { assignedConsultant } = await assignClient(client.id, consultantId || null);
    patchClient(client.id, { assignedConsultant });
    toast.success(assignedConsultant ? `${client.name} assigned to ${assignedConsultant.name}` : `${client.name} unassigned`);
  }

  async function viewForms(client) {
    setFormsModal('loading');
    const data = await getClientForms(client.id);
    setFormsModal({ client: data.client || client, forms: data.forms || [] });
  }

  if (!overview) {
    return <div className="grid h-[60vh] place-items-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <BackButton to="/admin" />
      <PageHeader title="Admin Panel" subtitle="Approvals, client & consultant management">
        <Badge tone="brand" dot>Admin access</Badge>
      </PageHeader>

      <Tabs tabs={VIEWS} active={view} onChange={setView} />

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      {/* ── 1. APPROVALS ─────────────────────────────────────────── */}
      {view === 'approvals' && (
        <Card
          title="Approvals"
          subtitle="Review pending clients — approve / reject and assign them to a consultant"
        >
          {!clients ? (
            <div className="grid h-40 place-items-center"><Spinner size={28} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-ink-700 text-left text-ink-400">
                    <th className="pb-3 font-medium">Client</th>
                    <th className="pb-3 font-medium">Client ID</th>
                    <th className="pb-3 font-medium">Assign consultant</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {clients.filter((c) => c.status === 'Pending').map((c) => (
                    <tr key={c.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} size={36} />
                          <div>
                            <p className="font-medium text-fg">{c.name}</p>
                            <p className="text-xs text-ink-500">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-300"><FiHash className="h-3 w-3" />{c.clientId}</span>
                      </td>
                      <td className="py-3">
                        <select
                          value={c.assignedConsultant?.id || ''}
                          onChange={(e) => assign(c, e.target.value)}
                          className="input-base h-9 w-44 py-0 text-xs"
                          aria-label={`Assign consultant for ${c.name}`}
                        >
                          {consultantOptions.map((o) => (
                            <option key={o.value || 'none'} value={o.value} className="bg-ink-800">{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="subtle" icon={FiCheck} onClick={() => changeStatus(c, 'Approved')}>Approve</Button>
                          <IconBtn label="Reject" icon={FiX} onClick={() => changeStatus(c, 'Rejected')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {clients.filter((c) => c.status === 'Pending').length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-ink-400">No pending approvals.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 2. CONSULTANTS ───────────────────────────────────────── */}
      {view === 'consultants' && (
        <Card
          title="Consultants"
          subtitle="All consultants in the system"
          action={<Button icon={FiUserPlus} onClick={() => setShowCreate(true)}>Add consultant</Button>}
        >
          {consultants.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No consultants yet. Add one to start assigning clients.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {consultants.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3.5">
                  <Avatar name={c.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-fg">{c.name}</p>
                    <p className="truncate text-xs text-ink-500">{c.email || c.title || '—'}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      <FiBriefcase className="mr-1 inline h-3 w-3" />
                      {c.assignedCount} client{c.assignedCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── 3. CLIENTS ───────────────────────────────────────────── */}
      {view === 'clients' && (
        <Card
          title="Clients"
          subtitle="Click any client to open their dashboard"
          action={
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients…" className="input-base w-48 pl-9" />
            </div>
          }
        >
          {!clients ? (
            <div className="grid h-40 place-items-center"><Spinner size={28} /></div>
          ) : clients.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No clients yet.</p>
          ) : (
            <ul className="space-y-2">
              {clients.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => navigate(`/dashboard?client=${encodeURIComponent(c.id)}`)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 px-4 py-3 text-left transition-colors hover:border-brand-500/40 hover:bg-ink-800"
                  >
                    <Avatar name={c.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">{c.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        <FiHash className="mr-0.5 inline h-3 w-3" />
                        {c.clientId || '—'} · {c.email}
                      </p>
                    </div>
                    <FiArrowRight className="h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-brand-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Forms modal */}
      <Modal
        open={Boolean(formsModal)}
        onClose={() => setFormsModal(null)}
        title={formsModal && formsModal !== 'loading' ? `${formsModal.client?.name} — submitted forms` : 'Loading forms…'}
        icon={FiFileText}
        size="lg"
      >
        {formsModal === 'loading' ? (
          <div className="grid h-32 place-items-center"><Spinner size={28} /></div>
        ) : (
          <FormsViewer forms={formsModal?.forms || []} />
        )}
      </Modal>

      {/* Create consultant */}
      <CreateConsultantModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(c) => {
          setConsultants((list) => [...list, { ...c, assignedCount: c.assignedCount || 0 }]);
          setShowCreate(false);
          toast.success(`Consultant ${c.name} created`);
        }}
      />
    </div>
  );
}

// Compact square icon button used in the actions column.
function IconBtn({ label, icon: Icon, onClick, disabled, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-lg border border-ink-600 p-2 text-ink-400 transition-colors disabled:opacity-40',
        danger ? 'hover:border-unproductive hover:text-unproductive' : 'hover:border-brand-500 hover:text-brand-400'
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CreateConsultantModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', title: '', department: '' });
  const [loading, setLoading] = useState(false);
  const upd = (e) => {
    const { name, value } = e.target;
    const next = name === 'name' ? titleCaseName(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
  };

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.email || form.password.length < 6) {
      toast.error('Name, email and a 6+ char password are required.');
      return;
    }
    setLoading(true);
    try {
      const c = await createConsultant(form);
      setForm({ name: '', email: '', password: '', title: '', department: '' });
      onCreated(c);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create consultant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a consultant" subtitle="Creates an approved consultant account" icon={FiBriefcase} size="md">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full name" name="name" value={form.name} onChange={upd} placeholder="Priya Nair" required />
        <Input label="Email" name="email" type="email" value={form.email} onChange={upd} placeholder="Enter your Email" autoComplete="off" required />
        <Input label="Temporary password" name="password" type="password" value={form.password} onChange={upd} placeholder="Min 6 characters" hint="Share this with the consultant to log in." required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Title" name="title" value={form.title} onChange={upd} placeholder="Consultant" />
          <Input label="Department" name="department" value={form.department} onChange={upd} placeholder="Coaching" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} icon={FiUserPlus}>Create consultant</Button>
        </div>
      </form>
    </Modal>
  );
}
