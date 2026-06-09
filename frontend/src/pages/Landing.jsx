import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiLogIn, FiTarget, FiTrendingUp, FiAward, FiUser, FiBriefcase, FiShield } from 'react-icons/fi';
import { Button, Badge, Logo } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: FiTarget, title: 'Stay Focused', desc: 'Eliminate distractions and protect deep-work hours.' },
  { icon: FiTrendingUp, title: 'Track Progress', desc: 'Measure productivity with clear, honest analytics.' },
  { icon: FiAward, title: 'Achieve More', desc: 'Build better habits and hit your goals every day.' },
];

/** Public first screen — brand, value prop, and Login / Sign Up. */
export default function Landing() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="always-dark relative min-h-screen overflow-hidden bg-auth-radial">
      <div className="absolute inset-0 bg-grid-faint opacity-30 [background-size:40px_40px]" />
      <div className="absolute -right-32 top-1/4 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo />
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to="/client-login" variant="ghost" icon={FiLogIn}>Login</Button>
          <Button as={Link} to="/register" icon={FiArrowRight}>Sign Up</Button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center sm:py-24">
        <Badge tone="brand" dot>Productivity Operating System</Badge>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 font-display text-4xl font-extrabold leading-tight text-fg-strong sm:text-6xl"
        >
          Master Your Productivity
          <br />
          <span className="text-gradient">Transform Your Habits</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 max-w-xl text-fg-muted"
        >
          Productivity Shastra is your enterprise-grade habit transformation platform — audit your time,
          eliminate distractions, and level up every single day.
        </motion.p>
        <div className="mt-8 flex justify-center">
          <Button as={Link} to="/register" size="lg" icon={FiArrowRight}>Get started — Sign Up</Button>
        </div>

        {/* Dedicated role-specific login entry points. Each routes to its own
            login page; the form itself does NOT show a role switcher. */}
        <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Button as={Link} to="/client-login" size="lg" variant="outline" icon={FiUser}>
            Login as Client
          </Button>
          <Button as={Link} to="/consultant-login" size="lg" variant="outline" icon={FiBriefcase}>
            Login as Consultant
          </Button>
          <Button as={Link} to="/admin-login" size="lg" variant="outline" icon={FiShield}>
            Login as Admin
          </Button>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm shadow-card"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                <f.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-semibold text-fg-strong">{f.title}</p>
              <p className="mt-1 text-sm text-fg-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
