import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiArrowLeft, FiShield, FiBriefcase, FiUser } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { roleHome } from '@/utils/roles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_META = {
  admin: { label: 'Admin', icon: FiShield, blurb: 'Sign in to your admin workspace.' },
  consultant: { label: 'Consultant', icon: FiBriefcase, blurb: 'Sign in to your consultant workspace.' },
  client: { label: 'Client', icon: FiUser, blurb: 'Log in to continue to Productivity Shastra.' },
};

/**
 * Single login form, parameterised by the role of the page it's shown on.
 * Three dedicated routes — /admin-login, /consultant-login, /client-login —
 * render this with the matching `role`. The legacy `/login` route renders
 * with role="client" so deep links keep working.
 */
export default function Login({ role = 'client' }) {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const meta = ROLE_META[role] || ROLE_META.client;
  const RoleIcon = meta.icon;

  const update = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => (fe[name] ? { ...fe, [name]: undefined } : fe));
  };

  function validate() {
    const e = {};
    if (!form.email.trim()) e.email = 'Email Required';
    else if (!EMAIL_RE.test(form.email)) e.email = 'Invalid Email';
    if (!form.password) e.password = 'Password Required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    try {
      const u = await login({ ...form, role });
      const dest = from && from !== '/dashboard' && from !== '/home' ? from : roleHome(u?.role);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Incorrect email or password.');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Button as={Link} to="/" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2 mb-4">
        Back
      </Button>

      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
        <RoleIcon className="h-3.5 w-3.5" /> {meta.label} Portal
      </div>
      <h2 className="font-display text-3xl font-bold text-white">{meta.label} Login</h2>
      <p className="mt-2 text-sm text-ink-400">{meta.blurb}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" autoComplete="off">
        {/* Decoy inputs to absorb Chrome's aggressive password-manager autofill
            (which ignores autoComplete="off" on real login forms). */}
        <input type="text" name="fakeusernameremembered" autoComplete="username" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        <input type="password" name="fakepasswordremembered" autoComplete="new-password" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />

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
          placeholder="ENTER YOUR EMAIL"
          value={form.email}
          onChange={update}
          autoComplete="off"
          error={fieldErrors.email}
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          icon={FiLock}
          placeholder="••••••••"
          value={form.password}
          onChange={update}
          autoComplete="new-password"
          error={fieldErrors.password}
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-brand-500 focus:ring-brand-500/40"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-brand-400 hover:text-brand-300">
            Forgot Password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Log in
        </Button>

        {role === 'client' && (
          <Button as={Link} to="/register" variant="outline" size="lg" className="w-full">
            Create Your Account
          </Button>
        )}
      </form>
    </motion.div>
  );
}
