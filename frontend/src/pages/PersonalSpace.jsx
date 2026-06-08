import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft, FiArrowRight,
  FiFeather, FiSun, FiCheckSquare, FiRepeat, FiClock,
  FiActivity, FiEdit3, FiMessageCircle,
} from 'react-icons/fi';
import { Button, PageHeader } from '@/components/ui';

export const PERSONAL_SPACE_MODULES = [
  { id: 'takeaway-crystaliser',    title: 'Takeaway Crystaliser',    icon: FiFeather,        desc: 'Crystalise the key takeaways from your week.' },
  { id: 'insights-illuminator',    title: 'Insights Illuminator',    icon: FiSun,            desc: 'Capture the insights that lit up for you.' },
  { id: 'results-recorder',        title: 'Results Recorder',        icon: FiCheckSquare,    desc: 'Record measurable results & wins.' },
  { id: 'habit-change-register',   title: 'Habit Change Register',   icon: FiRepeat,         desc: 'Track habits you are forming or breaking.' },
  { id: 'time-saver',              title: 'Time Saver',              icon: FiClock,          desc: 'Log time you saved and how you saved it.' },
  { id: 'productivity-calculator', title: 'Productivity Calculator', icon: FiActivity,       desc: 'Quickly calculate your productivity score.' },
  { id: 'personal-notes-taker',    title: 'Personal Notes Taker',    icon: FiEdit3,          desc: 'Personal notes — free-form thinking space.' },
  { id: 'feedback-form',           title: 'Feedback Form',           icon: FiMessageCircle,  desc: 'Share feedback for the team.' },
];

export default function PersonalSpace() {
  return (
    <div className="space-y-6">
      <Button as={Link} to="/dashboard" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader title="Personal Space" subtitle="Your private toolkit for reflection and growth." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAL_SPACE_MODULES.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            <Link
              to={`/personal-space/${m.id}`}
              className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-ink-700 bg-ink-850 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-glow"
            >
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-600/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-110">
                <m.icon className="h-5 w-5" />
              </span>
              <div className="relative flex flex-1 flex-col">
                <p className="text-base font-semibold text-white">{m.title}</p>
                <p className="mt-1 text-sm text-ink-400">{m.desc}</p>
              </div>
              <span className="relative inline-flex items-center gap-1.5 text-sm font-medium text-brand-400">
                Open <FiArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
