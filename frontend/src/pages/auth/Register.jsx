import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiArrowLeft, FiCheck, FiKey } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';
import {
  register as registerRequest,
  checkSignupAvailability,
  verifySignupCode,
  resendSignupCode,
} from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { titleCaseName } from '@/utils/format';
import { MANDATORY_MSG } from '@/utils/validation';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{7,10}$/;
// Min 8 chars, with at least one uppercase, lowercase, number and special char.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// Live password rules — keep these in sync with PASSWORD_RE above AND with the
// Supabase Auth password policy (min length 8, lower+upper+digit+symbol).
const PASSWORD_RULES = [
  { label: 'Min 8 characters', test: (v) => v.length >= 8 },
  { label: '1 uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: '1 lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: '1 number', test: (v) => /\d/.test(v) },
  { label: '1 special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

// Red until met, then green (literal hex — the app palette remaps Tailwind
// green→red, so we can't use text-green-* here).
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
  const { setAuthBusy } = useAuth();
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
  // After a successful signUp that needs email confirmation, we switch to a
  // code-entry step instead of leaving for /login.
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [code, setCode] = useState('');

  const update = (e) => {
    const { name } = e.target;
    let value = e.target.value;
    if (name === 'firstName' || name === 'lastName') {
      value = titleCaseName(value); // "hardik" → "Hardik"; "naresh" → "Naresh"
    } else if (name === 'cellNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((fe) => (fe[name] ? { ...fe, [name]: undefined } : fe));
  };

  // Live "already registered" check — runs when the user leaves the email or
  // phone field, so they see it immediately instead of only on submit. Network
  // hiccups are ignored here; handleSubmit re-checks before creating the account.
  async function checkAvailability(field) {
    try {
      if (field === 'email') {
        if (!form.email || !EMAIL_RE.test(form.email)) return;
        const { emailTaken } = await checkSignupAvailability(form.email, '');
        if (emailTaken) {
          setFieldErrors((fe) => ({ ...fe, email: 'An account already exists with this email.' }));
        }
      } else if (field === 'cellNumber') {
        if (!form.cellNumber || !PHONE_RE.test(form.cellNumber)) return;
        const fullPhone = `${form.countryCode}${form.cellNumber}`;
        const { phoneTaken } = await checkSignupAvailability('', fullPhone);
        if (phoneTaken) {
          setFieldErrors((fe) => ({ ...fe, cellNumber: 'An account already exists with this phone number.' }));
        }
      }
    } catch {
      /* ignore — submit will re-check */
    }
  }

  function validate() {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    if (!form.email) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.cellNumber) e.cellNumber = 'Cell number is required.';
    else if (!PHONE_RE.test(form.cellNumber)) e.cellNumber = 'Enter a valid cell number (7–10 digits).';
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
    setAuthBusy(true); // signUp may briefly create a session — don't let it flash the dashboard
    try {
      const fullPhone = `${form.countryCode}${form.cellNumber}`;

      // Stop duplicates up-front with a clear message (email is also enforced by
      // Supabase; phone is enforced by a unique index in the DB).
      const { emailTaken, phoneTaken } = await checkSignupAvailability(form.email, fullPhone);
      if (emailTaken || phoneTaken) {
        setFieldErrors({
          ...(emailTaken ? { email: 'An account already exists with this email.' } : {}),
          ...(phoneTaken ? { cellNumber: 'An account already exists with this phone number.' } : {}),
        });
        setError(
          emailTaken && phoneTaken
            ? 'An account already exists with this Email/Phone No.'
            : emailTaken
            ? 'An account already exists with this Email.'
            : 'An account already exists with this Phone No.'
        );
        setLoading(false);
        return;
      }

      const res = await registerRequest({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: fullPhone,
        password: form.password,
      });
      localStorage.setItem('ps_pending_registration', JSON.stringify(res.user || {}));
      if (res.needsEmailConfirmation) {
        // Email confirmation is on — prove the address is real via a code.
        setStep('code');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
      setAuthBusy(false);
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
    setAuthBusy(true); // verifyOtp signs in then we sign out — suppress the flash
    try {
      await verifySignupCode(form.email, code);
      navigate('/login');
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
      await resendSignupCode(form.email);
    } catch {
      /* ignore — they can try again */
    } finally {
      setLoading(false);
    }
  }

  if (step === 'code') {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h2 className="font-display text-3xl font-bold text-fg-strong">Verify your email</h2>
        <p className="mt-2 text-sm text-ink-400">
          We sent a 6-digit code to <span className="font-medium text-fg-strong">{form.email}</span>. Enter it below
          to finish creating your account.
        </p>

        <form onSubmit={handleCodeSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
              {error}
            </div>
          )}
          <Input
            label="Verification code"
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
            Verify &amp; create account
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setStep('form');
              setCode('');
              setError('');
            }}
            className="inline-flex items-center gap-2 font-medium text-ink-400 hover:text-fg-strong"
          >
            <FiArrowLeft className="h-4 w-4" /> Back
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
      </motion.div>
    );
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
          <Input label="First Name" name="firstName" icon={FiUser} value={form.firstName} onChange={update} placeholder="John" error={fieldErrors.firstName} required />
          <Input label="Last Name" name="lastName" value={form.lastName} onChange={update} placeholder="Smith" error={fieldErrors.lastName} required />
        </div>

        <Input label="Email" name="email" type="email" icon={FiMail} value={form.email} onChange={update} onBlur={() => checkAvailability('email')} placeholder="Enter your Email" error={fieldErrors.email} autoComplete="off" required />

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
                maxLength={10}
                value={form.cellNumber}
                onChange={update}
                onBlur={() => checkAvailability('cellNumber')}
                placeholder="10-digit cell number"
                className={`input-base pl-10 ${fieldErrors.cellNumber ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30' : ''}`}
                required
              />
            </div>
          </div>
          {fieldErrors.cellNumber && <p className="mt-1.5 text-xs text-brand-400">{fieldErrors.cellNumber}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Password" name="password" type="password" icon={FiLock} value={form.password} onChange={update} placeholder="••••••••" error={fieldErrors.password} required />
          <Input label="Confirm Password" name="confirm" type="password" icon={FiLock} value={form.confirm} onChange={update} placeholder="••••••••" error={fieldErrors.confirm} required />
        </div>

        {/* Live password checklist — each rule starts red and turns green as the
            typed password satisfies it (greens use literal hex because the app
            palette remaps Tailwind green→red). */}
        <PasswordRules value={form.password} />

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Create account &amp; continue
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{' '}
        <Link to="/client-login" className="font-medium text-brand-400 hover:text-brand-300">Log in</Link>
      </p>
    </motion.div>
  );
}
