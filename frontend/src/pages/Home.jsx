import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiActivity, FiCalendar, FiClock, FiSlash, FiArrowRight,
  FiUsers, FiTarget, FiClipboard,
} from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';

/**
 * Home dashboard cards.
 *
 * - `enabled: true`  → renders as a <Link> and navigates to `to`.
 * - `enabled: false` → renders as a static, non-clickable card (display-only).
 *
 * Layout per product spec:
 *   Row 1: Pre PS · Time Auditor · Time Finder
 *   Row 2: Reason Eliminator · Power Planner · Meeting Framework · Post PS
 */
const ROW_ONE = [
  { key: 'pre-ps',   title: 'Pre PS',        icon: FiTarget,   to: '/pre-ps',    enabled: true },
  { key: 'auditor',  title: 'Time Auditor',  icon: FiActivity, to: '/dashboard', enabled: true },
  { key: 'finder',   title: 'Time Finder',   icon: FiClock,    to: '/time-finder', enabled: true },
];

const ROW_TWO = [
  { key: 'reason',   title: 'Reason Eliminator', icon: FiSlash,    to: '/reason-eliminator', enabled: true },
  { key: 'planner',  title: 'Power Planner',     icon: FiCalendar, to: '/power-planner',      enabled: true },
  { key: 'meeting',  title: 'Meeting Framework', icon: FiUsers,    to: '/meeting-framework',  enabled: true },
  { key: 'post-ps',  title: 'Post PS',           icon: FiClipboard, to: '/post-ps',           enabled: true },
];

function ModuleCard({ item, index }) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={item.enabled ? { y: -5 } : undefined}
      whileTap={item.enabled ? { scale: 0.98 } : undefined}
      className={
        'group relative h-full overflow-hidden rounded-2xl border bg-ink-850 p-6 text-left transition-colors ' +
        (item.enabled
          ? 'border-ink-700 hover:border-brand-500/50 hover:shadow-glow cursor-pointer'
          : 'border-ink-700 opacity-90 cursor-default')
      }
    >
      {item.enabled && (
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-600/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
      )}
      <span
        className={
          'relative grid h-14 w-14 place-items-center rounded-2xl text-white shadow-glow transition-transform ' +
          (item.enabled ? 'bg-brand-gradient group-hover:scale-110' : 'bg-brand-gradient')
        }
      >
        <item.icon className="h-6 w-6" />
      </span>
      <p className="relative mt-5 flex items-center justify-between text-lg font-bold text-white">
        {item.title}
        {item.enabled && (
          <FiArrowRight className="h-5 w-5 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-400" />
        )}
      </p>
    </motion.div>
  );

  return item.enabled ? (
    <Link to={item.to} className="block h-full">{inner}</Link>
  ) : (
    <div
      className="block h-full select-none"
      role="button"
      aria-disabled="true"
      tabIndex={-1}
      onClick={(e) => e.preventDefault()}
    >
      {inner}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Welcome, {firstName} 👋</h1>
        <p className="mt-2 text-ink-400">Choose a module below to get started.</p>
      </div>

      {/* Row 1 — 3 cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ROW_ONE.map((item, i) => (
          <ModuleCard key={item.key} item={item} index={i} />
        ))}
      </div>

      {/* Row 2 — 4 cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ROW_TWO.map((item, i) => (
          <ModuleCard key={item.key} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}
