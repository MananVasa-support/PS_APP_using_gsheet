import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLock, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import { updatePassword, hasRecoverySession, clearRecoverySession } from '@/services/authService';
import { isConfigured } from '@/lib/gsApi';

// Keep these in lock-step with Register.jsx AND the Supabase password policy
// (min 8 + lower + upper + digit + symbol).
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_RULES = [
  { label: 'Min 8 characters', test: (v) => v.length >= 8 },
  { label: '1 uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: '1 lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: '1 number', test: (v) => /\d/.test(v) },
  { label: '1 special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

// Red until met, then green (literal hex — the app palette remaps Tailwind
// green→red, so we can't use text-green-* here). Mirrors Register.jsx.
function PasswordRules({ value = '' }) {
  return (
    <ul className="-mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.label}
            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-300"
            style={{ color: ok ? '#22c55e' : '#f87171' }}
          >
            <span
              className="grid h-4 w-4 place-items-center rounded-full transition-all duration-300"
              style={{
                backgroundColor: ok ? '#22c55e' : 'rgba(248,113,113,0.15)',
                color: ok ? '#ffffff' : '#f87171',
              }}
            >
              {ok ? <FiCheck className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Where the password-reset flow lands after the 6-digit code is verified.
 * ForgotPassword stored a one-time reset token (the "recovery session", in
 * sessionStorage); here the user chooses a new password, which consumes it.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Whether we actually arrived from a verified reset code (a recovery token).
  const [ready] = useState(() => !isConfigured || hasRecoverySession()); // demo mode is always "ready"
  // Tracks "did the user actually finish the reset?" — read in the unmount
  // cleanup below to decide whether to discard the recovery session.
  const doneRef = useRef(false);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  // If the user LEAVES this page without finishing (clicks Back, closes, etc.),
  // the recovery token would otherwise linger — clear it so the abandoned reset
  // can't be resumed by whoever opens the tab next.
  useEffect(() => {
    return () => {
      if (isConfigured && !doneRef.current) {
        localStorage.removeItem('ps_reset_pending');
        clearRecoverySession();
      }
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!PASSWORD_RE.test(password)) {
      setError('Min 8 chars with an uppercase, lowercase, number & special character.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      localStorage.removeItem('ps_reset_pending'); // reset completed successfully
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Could not reset your password. The link may have expired — request a new one.');
    } finally {
      setLoading(false);
    }
  }

  // Leaving mid-reset: drop the recovery token first, then go to login.
  async function backToLogin() {
    doneRef.current = true; // we're handling the cleanup here; skip the unmount cleanup
    localStorage.removeItem('ps_reset_pending');
    if (isConfigured) clearRecoverySession();
    navigate('/login');
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-productive/15 text-productive">
          <FiCheckCircle className="h-7 w-7" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold text-fg-strong">Password updated</h2>
        <p className="mt-2 text-sm text-ink-400">You can now log in with your new password.</p>
        <Button onClick={() => navigate('/login')} size="lg" className="mt-8 w-full">
          Go to login
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2 className="font-display text-3xl font-bold text-fg-strong">Set a new password</h2>
      <p className="mt-2 text-sm text-ink-400">Choose a strong password for your account.</p>

      {isConfigured && !ready && (
        <div className="mt-6 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
          Open this page from the reset link in your email. If you got here another way, request a new link from{' '}
          <Link to="/forgot-password" className="font-medium underline">Forgot Password</Link>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
            {error}
          </div>
        )}

        <Input
          label="New Password"
          name="password"
          type="password"
          icon={FiLock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <Input
          label="Confirm New Password"
          name="confirm"
          type="password"
          icon={FiLock}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
        />

        <PasswordRules value={password} />

        <Button type="submit" size="lg" loading={loading} disabled={isConfigured && !ready} className="w-full">
          Update password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        Remembered it?{' '}
        <button
          type="button"
          onClick={backToLogin}
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Back to login
        </button>
      </p>
    </motion.div>
  );
}
