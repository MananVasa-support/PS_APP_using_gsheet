import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiActivity, FiCalendar, FiClock, FiSlash, FiArrowRight,
  FiTarget, FiTrendingUp, FiGrid, FiUsers, FiChevronRight, FiLock,
  FiCompass, FiMessageCircle,
} from 'react-icons/fi';
import { Avatar, Button, Card, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext.jsx';
import * as consultantService from '@/services/consultantService';
import * as adminService from '@/services/adminService';

/**
 * Main Dashboard — full-width layout, no left sidebar.
 *
 * Sections (top → bottom):
 *   1. Tools list — the product tools (Totality Collector, Sales
 *      Cultivator, Time Auditor, Power Planner, Reasons Eliminator, Time
 *      Finder, Meeting Success Maximizer, Personal Space).
 */

const MODULES = [
  { key: 'expectations', title: 'Expectations Crystalliser ©', icon: FiCompass,    to: '/expectations-crystalliser' },
  { key: 'totality',  title: 'Totality Collector ©',     icon: FiTarget,     to: '/pre-ps/totality' },
  { key: 'sales',     title: 'Sales Cultivator ©',       icon: FiTrendingUp, to: '/sales-cultivator' },
  { key: 'auditor',   title: 'Time Auditor ©',           icon: FiActivity,   to: '/time-auditor' },
  { key: 'planner',   title: 'Power Planner ©',          icon: FiCalendar,   to: '/power-planner' },
  { key: 'reasons',   title: 'Reasons Eliminator ©',     icon: FiSlash,      to: '/reason-eliminator' },
  { key: 'finder',    title: 'Time Finder ©',            icon: FiClock,      to: '/time-finder' },
  { key: 'meeting',   title: 'Meeting Success Maximizer ©', icon: FiUsers,   to: '/meeting-framework' },
  { key: 'personal',  title: 'Personal Space ©',         icon: FiGrid,       to: '/personal-space' },
  { key: 'feedback',  title: 'Feedback Form ©',          icon: FiMessageCircle, to: '/feedback' },
];

function ModuleCard({ item, index, readOnly, onBlocked }) {
  const inner = (
    <>
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-600/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-110">
        <item.icon className="h-5 w-5" />
      </span>
      <p className="relative flex-1 text-base font-semibold text-fg-strong">
        {item.title}
        <sup className="ml-0.5 text-[0.65em] font-medium text-ink-400">©</sup>
      </p>
      {readOnly ? (
        <FiLock className="relative h-5 w-5 text-ink-500" aria-hidden />
      ) : (
        <FiArrowRight className="relative h-5 w-5 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-400" />
      )}
    </>
  );
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      {readOnly ? (
        <button
          type="button"
          onClick={onBlocked}
          aria-disabled="true"
          title="Read-only preview — module disabled while viewing a client"
          className="group relative flex w-full cursor-not-allowed items-center gap-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-5 text-left opacity-60"
        >
          {inner}
        </button>
      ) : (
        <Link
          to={item.to}
          className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow"
        >
          {inner}
        </Link>
      )}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user, isAdmin, isConsultant } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const selectedClientId = searchParams.get('client');
  const [viewedClient, setViewedClient] = useState(null);

  // When an admin or consultant is viewing a client's dashboard, fetch that
  // client so the greeting + context banner reflect the CLIENT, not the staff
  // user. Admins use the admin service (sees all clients); consultants use the
  // consultant service (sees only assigned clients).
  useEffect(() => {
    if (!selectedClientId) { setViewedClient(null); return; }
    if (!isAdmin && !isConsultant) { setViewedClient(null); return; }
    let active = true;
    const fetch = isAdmin
      ? adminService.getClients({ status: 'All' })
      : consultantService.getMyClients();
    fetch.then((d) => {
      if (!active) return;
      setViewedClient((d.clients || []).find((c) => c.id === selectedClientId) || null);
    });
    return () => { active = false; };
  }, [isAdmin, isConsultant, selectedClientId]);

  // Admins & consultants without a selected client see a clients picker instead
  // of the modules.
  if ((isAdmin || isConsultant) && !selectedClientId) {
    return <StaffClientsPicker isAdmin={isAdmin} />;
  }

  const isClientView = (isAdmin || isConsultant) && Boolean(selectedClientId);
  const displayName = isClientView
    ? (viewedClient?.name?.split(' ')[0] || 'client')
    : (user?.name?.split(' ')[0] || 'there');

  return (
    <div className="space-y-6">
      {isClientView && viewedClient && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={viewedClient.name} size={36} />
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-fg-strong">
                Viewing {viewedClient.name}'s dashboard
                <span className="inline-flex items-center gap-1 rounded-full border border-ink-600 bg-ink-900/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-300">
                  <FiLock className="h-3 w-3" /> Read-only
                </span>
              </p>
              <p className="font-mono text-xs text-brand-300">{viewedClient.clientId || '—'}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard', { replace: true })}>
            Switch client
          </Button>
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-fg-strong">
          {isClientView ? `${displayName}'s Dashboard` : `Welcome Back, ${displayName}`} 👋
        </h1>
        {isClientView && (
          <p className="mt-1 text-sm text-ink-400">
            Tools are disabled in this read-only preview — no live data is wired up for this client yet.
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-500">Choose a Tool to get started</h2>
        {/* Stacked on phones; side-by-side and wrapping on iPad / laptop / wide. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m, i) => (
            <ModuleCard
              key={m.key}
              item={m}
              index={i}
              readOnly={isClientView}
              onBlocked={blockAction}
            />
          ))}
        </div>
      </section>
    </div>
  );

  function blockAction() {
    toast.info('Read-only preview — this client view has no real data to act on.');
  }
}

/**
 * Shown when an admin or consultant lands on /dashboard with no ?client=<id>
 * selected. Lets them pick which client's dashboard to open. Admins see all
 * clients; consultants see only their assigned clients.
 */
function StaffClientsPicker({ isAdmin }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState(null);

  useEffect(() => {
    const fetch = isAdmin
      ? adminService.getClients({ status: 'All' })
      : consultantService.getMyClients();
    fetch.then((d) => setClients(d.clients || []));
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-fg-strong">
          {isAdmin ? 'All clients' : 'Your clients'}
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          Pick a client to open their Time Auditor dashboard.
        </p>
      </div>

      <Card>
        {clients === null ? (
          <div className="grid h-40 place-items-center"><Spinner size={28} /></div>
        ) : clients.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">
            {isAdmin ? 'No clients in the system yet.' : 'No clients assigned to you yet.'}
          </p>
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
                    <p className="truncate font-mono text-xs text-ink-500">{c.clientId || '—'}</p>
                  </div>
                  <FiChevronRight className="h-4 w-4 shrink-0 text-ink-500 transition-colors group-hover:text-brand-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
