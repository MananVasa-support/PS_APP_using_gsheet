import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AiFillHome } from 'react-icons/ai';
import { FaHistory, FaPlay, FaChartBar } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const NAV_ITEMS = [
  { label: 'Home', Icon: AiFillHome, to: '/', active: true },
  { label: 'Previous Assessments', Icon: FaHistory, to: '/previous-assessment', active: false },
  { label: 'Dashboard', Icon: MdDashboard, to: '/dashboard', active: false },
];

/* ---------- Top-right pill nav ---------- */

function TopNav() {
  const navigate = useNavigate();
  return (
    <nav className="absolute right-10 top-6 flex items-center gap-3">
      {NAV_ITEMS.map(({ label, Icon, active, to }) => (
        <motion.button
          {...press}
          key={label}
          type="button"
          onClick={() => navigate(to)}
          className={
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
            (active
              ? 'bg-red-100 text-red-600 hover:bg-red-500 hover:text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-red-500 hover:text-white')
          }
        >
          <Icon className="text-base" />
          <span>{label}</span>
        </motion.button>
      ))}
    </nav>
  );
}

/* ---------- Card buttons ---------- */

function CardButton({ children, Icon, variant = 'outline', onClick }) {
  const base =
    'flex w-full items-center justify-center gap-3 rounded-xl py-4 text-base font-semibold transition-colors';
  const styles =
    variant === 'primary'
      ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:from-red-600 hover:to-red-700'
      : 'border-2 border-red-500 bg-white text-red-500 hover:bg-red-50';
  return (
    <motion.button {...press} type="button" onClick={onClick} className={`${base} ${styles}`}>
      <Icon className="text-lg" />
      <span>{children}</span>
    </motion.button>
  );
}

/* ---------- Page ---------- */

export default function FirstPage() {
  const navigate = useNavigate();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-16">
      <TopNav />

      {/* Title + subtitle */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-black">Time Finder</h1>
        <p className="mt-3 text-base text-gray-500">
          Track, analyze and optimize your daily time usage
        </p>
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex w-full max-w-xl flex-col gap-4 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5"
      >
        <CardButton variant="primary" Icon={FaPlay} onClick={() => navigate('/time-finder/select-routines')}>
          Start New Assessment
        </CardButton>
        <CardButton Icon={FaHistory} onClick={() => navigate('/time-finder/previous-assessment')}>
          Previous Assessments
        </CardButton>
        <CardButton Icon={FaChartBar} onClick={() => navigate('/time-finder/dashboard')}>
          Dashboard
        </CardButton>
      </motion.div>
    </div>
  );
}
