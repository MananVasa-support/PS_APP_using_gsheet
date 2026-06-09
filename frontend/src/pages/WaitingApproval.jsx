import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiRefreshCw, FiLogOut, FiHash } from 'react-icons/fi';
import { Button, Logo } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUser } from '@/services/authService';

/** Shown to authenticated users whose account is still Pending admin approval. */
export default function WaitingApproval() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  async function refresh() {
    setChecking(true);
    try {
      const fresh = await getCurrentUser();
      setUser((u) => ({ ...u, ...fresh }));
      if (fresh?.status === 'Approved') navigate('/dashboard', { replace: true });
    } finally {
      setChecking(false);
    }
  }

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="always-dark grid min-h-screen place-items-center bg-auth-radial px-4 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-8">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-neutral/15 text-neutral">
            <FiClock className="h-8 w-8 animate-pulse" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-fg-strong">Waiting for approval</h1>
          <p className="mt-3 text-sm text-ink-400">
            Your Productivity Shastra profile is under review. You&apos;ll receive an email once an admin approves
            your account — then you can access your dashboard.
          </p>
          {user?.clientId && (
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-xl bg-ink-800 px-3 py-2 font-mono text-sm text-fg">
              <FiHash className="h-4 w-4 text-brand-400" /> {user.clientId}
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={refresh} loading={checking} icon={FiRefreshCw} size="lg">Refresh status</Button>
            <Button onClick={signOut} variant="outline" size="lg" icon={FiLogOut}>Log out</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
