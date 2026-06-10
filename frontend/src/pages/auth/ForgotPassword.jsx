import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiKey } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { requestPasswordResetCode, verifyPasswordResetCode } from '@/services/authService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Code-based password reset.
 *  Step "email" — enter email. If no account exists we say so plainly; if it
 *                 does, Supabase emails a 6-digit code and we move to step 2.
 *  Step "code"  — type the code. On success Supabase opens a recovery session
 *                 and we send the user to /reset-password to set a new password.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { setAuthBusy } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    if (!EMAIL_RE.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordResetCode(email);
      if (!res.exists) {
        setError('No account exists with this email.');
        return;
      }
      setStep('code');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Enter the code from your email.');
      return;
    }
    setLoading(true);
    setAuthBusy(true); // recovery session becomes active — don't flash the dashboard before we redirect
    try {
      await verifyPasswordResetCode(email, code);
      // Mark the reset as in-progress: if the user abandons it and reopens the
      // app, AuthContext will refuse to auto-login from the leftover recovery
      // session (cleared again once the password is actually changed).
      localStorage.setItem('ps_reset_pending', '1');
      // Recovery session is now active → go set the new password.
      navigate('/reset-password');
    } catch (err) {
      setError(err?.message || 'That code is invalid or has expired. Request a new one.');
    } finally {
      setLoading(false);
      setAuthBusy(false);
    }
  }

  async function resendCode() {
    setError('');
    setLoading(true);
    try {
      await requestPasswordResetCode(email);
    } catch {
      /* ignore — they can try again */
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {step === 'email' ? (
        <>
          <h2 className="font-display text-3xl font-bold text-fg-strong">Forgot Password?</h2>
          <p className="mt-2 text-sm text-ink-400">
            Enter your email and we&apos;ll send you a code to reset your password.
          </p>

          <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
                {error}
              </div>
            )}
            <Input
              label="Email"
              name="email"
              type="email"
              icon={FiMail}
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Send reset code
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-400 hover:text-fg-strong"
          >
            <FiArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </>
      ) : (
        <>
          <h2 className="font-display text-3xl font-bold text-fg-strong">Enter your code</h2>
          <p className="mt-2 text-sm text-ink-400">
            We sent a code to <span className="font-medium text-fg-strong">{email}</span>. Enter it below to continue.
          </p>

          <form onSubmit={handleCodeSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
                {error}
              </div>
            )}
            <Input
              label="Reset code"
              name="code"
              icon={FiKey}
              inputMode="numeric"
              maxLength={8}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              autoComplete="one-time-code"
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Verify code
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError('');
              }}
              className="inline-flex items-center gap-2 font-medium text-ink-400 hover:text-fg-strong"
            >
              <FiArrowLeft className="h-4 w-4" /> Use a different email
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="font-medium text-brand-400 hover:text-brand-300 disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
