import { Suspense } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTarget, FiTrendingUp, FiAward } from 'react-icons/fi';
import Logo from '@/components/ui/Logo.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import Footer from '@/components/layout/Footer.jsx';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: FiTarget, title: 'Stay Focused', desc: 'Eliminate distractions and protect your deep-work hours.' },
  { icon: FiTrendingUp, title: 'Track Progress', desc: 'Measure productivity with clear, honest analytics.' },
  { icon: FiAward, title: 'Achieve More', desc: 'Build better habits and hit your goals every day.' },
];

/**
 * Split-screen auth shell: branded story panel on the left, form (Outlet)
 * on the right. Already-authenticated users are bounced to the dashboard.
 */
export default function AuthLayout() {
  const { isAuthenticated, authBusy } = useAuth();
  const location = useLocation();
  // /reset-password runs on a temporary "recovery" session — that counts as
  // authenticated, but we must NOT bounce it to the dashboard or the user could
  // never set their new password. authBusy covers the brief signup/verify
  // sessions that get signed out a moment later (prevents a dashboard flicker).
  const isResetRoute = location.pathname === '/reset-password';
  if (isAuthenticated && !authBusy && !isResetRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="always-dark flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-2">
      {/* Brand / story panel */}
      <div className="relative hidden overflow-hidden bg-auth-radial p-10 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-grid-faint [background-size:40px_40px] opacity-40" />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-brand-600/20 blur-3xl" />

        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 my-auto max-w-md">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl font-extrabold leading-tight text-fg-strong"
          >
            Master Your Productivity <br />
            <span className="text-gradient">Transform Your Habits</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-fg-muted"
          >
            Productivity Shastra helps you plan smarter, stay focused, and achieve more every single day.
          </motion.p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-brand-400 ring-1 ring-white/10">
                  <f.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-semibold text-fg-strong">{f.title}</p>
                <p className="mt-1 text-xs text-slate-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-ink-950 p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Logo for mobile (story panel is hidden) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <Suspense fallback={<div className="grid h-64 place-items-center"><Spinner size={28} /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </div>
      </div>

      <Footer variant="auth" />
    </div>
  );
}
