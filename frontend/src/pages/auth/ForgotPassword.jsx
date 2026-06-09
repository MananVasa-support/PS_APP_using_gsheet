import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import { forgotPassword } from '@/services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
      setSent(true);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {sent ? (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-productive/15 text-productive">
            <FiCheckCircle className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold text-fg-strong">Check your inbox</h2>
          <p className="mt-2 text-sm text-ink-400">{message}</p>
          <Button as={Link} to="/login" variant="outline" size="lg" className="mt-8 w-full">
            Back to login
          </Button>
        </div>
      ) : (
        <>
          <h2 className="font-display text-3xl font-bold text-fg-strong">Forgot Password?</h2>
          <p className="mt-2 text-sm text-ink-400">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              icon={FiMail}
              placeholder="ENTER YOUR EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>

          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-400 hover:text-fg-strong"
          >
            <FiArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </>
      )}
    </motion.div>
  );
}
