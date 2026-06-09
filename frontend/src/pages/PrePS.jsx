import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiTarget, FiGrid } from 'react-icons/fi';
import { BackButton, Button, PageHeader } from '@/components/ui';

// Sub-modules under Pre PS. Power Planner is accessed from within Totality.
const SUB_ITEMS = [
  { key: 'expectation', title: 'Expectation From PS', icon: FiTarget, to: '/pre-ps/expectation' },
  { key: 'totality', title: 'Totality', icon: FiGrid, to: '/pre-ps/totality' },
];

export default function PrePS() {
  return (
    <div className="space-y-6">
      <BackButton to="/dashboard" />

      <PageHeader title="Pre PS" subtitle="Prepare before your problem-solving session" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SUB_ITEMS.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <Link
              to={s.to}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-600/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-110">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="relative flex-1 text-lg font-bold text-fg-strong">{s.title}</span>
              <FiArrowRight className="relative h-5 w-5 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-400" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
