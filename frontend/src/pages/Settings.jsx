import { useState } from 'react';
import {
  FiUser, FiSave, FiKey, FiEdit2, FiMail, FiPhone, FiMapPin,
} from 'react-icons/fi';
import { Card, Input, Button, Avatar, PageHeader, BackButton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext.jsx';
import { titleCaseName } from '@/utils/format';
import { countryFromPhone } from '@/utils/phone';
import { updateProfile } from '@/services/userService';
import { requestEmailChange, verifyEmailChange } from '@/services/authService';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  // Profile — real, editable account data (name/phone save to Supabase;
  // changing the email triggers an in-tab 6-digit confirmation).
  const [pform, setPform] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [pSaving, setPSaving] = useState(false);
  const [pError, setPError] = useState('');
  const [emailChange, setEmailChange] = useState(null); // { newEmail } while awaiting the code
  const [emailCode, setEmailCode] = useState('');
  const [pEditing, setPEditing] = useState(false); // view by default; Edit unlocks the inputs

  const setP = (e) => {
    const { name, value } = e.target;
    let next = value;
    if (name === 'name') {
      next = titleCaseName(value);
    } else if (name === 'phone') {
      // "+" then at most 12 digits (e.g. +91 country code + 10-digit number).
      const digits = value.replace(/\D/g, '').slice(0, 12);
      next = digits ? `+${digits}` : '';
    }
    setPform((f) => ({ ...f, [name]: next }));
  };

  function cancelEdit() {
    setPform({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
    setPError('');
    setPEditing(false);
  }

  async function saveProfile() {
    setPError('');
    setPSaving(true);
    try {
      const nameChanged = (pform.name || '') !== (user?.name || '');
      const phoneChanged = (pform.phone || '') !== (user?.phone || '');
      if (nameChanged || phoneChanged) {
        const updated = await updateProfile({ name: pform.name, phone: pform.phone });
        setUser((u) => ({ ...u, ...updated }));
      }
      const newEmail = (pform.email || '').trim();
      if (newEmail && newEmail !== (user?.email || '')) {
        // Email change needs confirmation on the NEW address — do it right here.
        await requestEmailChange(newEmail);
        setEmailChange({ newEmail });
        toast.info(`Enter the code we sent to ${newEmail}.`);
      } else {
        toast.success('Profile saved');
        setPEditing(false);
      }
    } catch (err) {
      setPError(err?.message || 'Could not save your changes.');
    } finally {
      setPSaving(false);
    }
  }

  async function confirmEmail(e) {
    e.preventDefault();
    setPError('');
    setPSaving(true);
    try {
      await verifyEmailChange(emailChange.newEmail, emailCode);
      setUser((u) => ({ ...u, email: emailChange.newEmail }));
      setEmailChange(null);
      setEmailCode('');
      setPEditing(false);
      toast.success('Email updated.');
    } catch (err) {
      setPError(err?.message || 'Invalid or expired code.');
    } finally {
      setPSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="Settings" subtitle="Manage your profile and account details" />

      <Card title="Profile" subtitle="Your account details">
        <div className="flex items-center gap-4">
          <Avatar name={user?.name} src={user?.avatar} size={64} />
          <div>
            <p className="font-medium text-fg-strong">{pform.name || user?.name}</p>
            <p className="text-sm text-ink-400 capitalize">{user?.role}</p>
          </div>
        </div>

        {pError && (
          <div className="mt-4 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
            {pError}
          </div>
        )}

        {emailChange ? (
          /* In-tab email-change confirmation */
          <form onSubmit={confirmEmail} className="mt-6 max-w-md space-y-4">
            <p className="text-sm text-ink-400">
              We sent a 6-digit code to{' '}
              <span className="font-medium text-fg-strong">{emailChange.newEmail}</span>. Enter it to confirm your
              new email.
            </p>
            <Input
              label="Confirmation code"
              icon={FiKey}
              inputMode="numeric"
              maxLength={8}
              placeholder="6-digit code"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              autoComplete="one-time-code"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEmailChange(null);
                  setEmailCode('');
                  setPError('');
                  setPform((f) => ({ ...f, email: user?.email || '' }));
                }}
              >
                Cancel
              </Button>
              <Button type="submit" icon={FiSave} loading={pSaving}>
                Confirm email
              </Button>
            </div>
          </form>
        ) : pEditing ? (
          /* Edit mode — unlocked only after clicking Edit */
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Display name" name="name" value={pform.name} onChange={setP} />
              <Input label="Email" type="email" name="email" value={pform.email} onChange={setP} autoComplete="off" />
              <Input label="Phone" name="phone" value={pform.phone} onChange={setP} placeholder="+91XXXXXXXXXX" inputMode="tel" maxLength={13} />
              <Input
                label="Country"
                value={countryFromPhone(pform.phone || user?.phone) || 'Not set'}
                readOnly
                hint="From your phone's country code."
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button icon={FiSave} loading={pSaving} onClick={saveProfile}>
                Save changes
              </Button>
            </div>
          </>
        ) : (
          /* View mode (default) — read-only until Edit is clicked */
          <>
            <dl className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {[
                { icon: FiUser, label: 'Display name', value: user?.name || '—' },
                { icon: FiMail, label: 'Email', value: user?.email || '—' },
                { icon: FiPhone, label: 'Phone', value: user?.phone || 'Not set' },
                { icon: FiMapPin, label: 'Country', value: countryFromPhone(user?.phone) || 'Not set' },
              ].map((d) => (
                <div key={d.label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-ink-400">
                    <d.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <dt className="text-xs text-ink-500">{d.label}</dt>
                    <dd className="text-fg">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" icon={FiEdit2} onClick={() => setPEditing(true)}>
                Edit
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
