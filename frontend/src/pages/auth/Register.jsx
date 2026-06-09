import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiArrowLeft } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import { register as registerRequest } from '@/services/authService';
import { titleCaseName } from '@/utils/format';
import { MANDATORY_MSG } from '@/utils/validation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{7,15}$/;
// Min 8 chars, with at least one uppercase, lowercase, number and special char.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Common country dial codes — extend as needed without touching backend.
const COUNTRY_CODES = [
  { code: '+91', label: '+91 India' },
  { code: '+1', label: '+1 United States' },
  { code: '+44', label: '+44 United Kingdom' },
  { code: '+61', label: '+61 Australia' },
  { code: '+971', label: '+971 UAE' },
  { code: '+65', label: '+65 Singapore' },
  { code: '+49', label: '+49 Germany' },
  { code: '+33', label: '+33 France' },
  { code: '+81', label: '+81 Japan' },
  { code: '+86', label: '+86 China' },
  { code: '+92', label: '+92 Pakistan' },
  { code: '+880', label: '+880 Bangladesh' },
];

/**
 * Basic registration. On success we stash the created (Pending) user and send
 * them to the login screen.
 */
export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    cellNumber: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (e) => {
    const { name } = e.target;
    let value = e.target.value;
    if (name === 'firstName' || name === 'lastName') {
      value = titleCaseName(value); // "hardik" → "Hardik"; "naresh" → "Naresh"
    } else if (name === 'cellNumber') {
      value = value.replace(/\D/g, '').slice(0, 15);
    }
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => (fe[name] ? { ...fe, [name]: undefined } : fe));
  };

  function validate() {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.cellNumber) e.cellNumber = 'Cell number is required.';
    else if (!PHONE_RE.test(form.cellNumber)) e.cellNumber = 'Enter a valid cell number (7–15 digits).';
    if (!form.password) e.password = 'Password is required.';
    else if (!PASSWORD_RE.test(form.password))
      e.password = 'Min 8 chars with an uppercase, lowercase, number & special character.';
    if (!form.confirm) e.confirm = 'Please confirm your password.';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError(MANDATORY_MSG);
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${form.countryCode}${form.cellNumber}`;
      const res = await registerRequest({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: fullPhone,
        password: form.password,
      });
      localStorage.setItem('ps_pending_registration', JSON.stringify(res.user || {}));
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Button as={Link} to="/client-login" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2 mb-4">
        Back
      </Button>
      <h2 className="font-display text-3xl font-bold text-fg-strong">Registration Form</h2>
      <p className="mt-2 text-sm text-ink-400">Join Productivity Shastra to master your Life.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" name="firstName" icon={FiUser} value={form.firstName} onChange={update} placeholder="Hardik" error={fieldErrors.firstName} required />
          <Input label="Last Name" name="lastName" value={form.lastName} onChange={update} placeholder="Patel" error={fieldErrors.lastName} required />
        </div>

        <Input label="Email" name="email" type="email" icon={FiMail} value={form.email} onChange={update} placeholder="Enter your Email" error={fieldErrors.email} autoComplete="off" required />

        {/* Cell Number with country-code selector */}
        <div>
          <label htmlFor="cellNumber" className="mb-1.5 block text-sm font-medium text-fg-muted">
            Cell Number<span className="ml-0.5 text-brand-400">*</span>
          </label>
          <div className="flex gap-2">
            <select
              name="countryCode"
              value={form.countryCode}
              onChange={update}
              className="input-base w-44 shrink-0"
              aria-label="Country code"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code} className="bg-ink-800">
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1">
              <FiPhone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="cellNumber"
                name="cellNumber"
                type="tel"
                inputMode="numeric"
                maxLength={15}
                value={form.cellNumber}
                onChange={update}
                placeholder="10-digit cell number"
                className={`input-base pl-10 ${fieldErrors.cellNumber ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30' : ''}`}
                required
              />
            </div>
          </div>
          {fieldErrors.cellNumber && <p className="mt-1.5 text-xs text-brand-400">{fieldErrors.cellNumber}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Password" name="password" type="password" icon={FiLock} value={form.password} onChange={update} placeholder="••••••••" error={fieldErrors.password} hint="Min 8 Characters · 1 upper case · 1 lower case · 1 number · 1 special Character" required />
          <Input label="Confirm Password" name="confirm" type="password" icon={FiLock} value={form.confirm} onChange={update} placeholder="••••••••" error={fieldErrors.confirm} required />
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account &amp; continue
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{' '}
        <Link to="/client-login" className="font-medium text-brand-400 hover:text-brand-300">Sign in</Link>
      </p>
    </motion.div>
  );
}
