import { useState } from 'react';
import {
  FiUser, FiSliders, FiBell, FiDatabase, FiRefreshCw, FiSave, FiKey,
  FiDownload, FiFileText, FiActivity, FiCamera, FiPauseCircle,
} from 'react-icons/fi';
import {
  Card, Tabs, Toggle, Input, Select, Button, Avatar, Modal, PageHeader, BackButton,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { downloadCsv, exportPdf } from '@/utils/export';
import { titleCaseName } from '@/utils/format';
import { countryFromPhone } from '@/utils/phone';
import { updateProfile } from '@/services/userService';
import { requestEmailChange, verifyEmailChange } from '@/services/authService';
import { timeEntries } from '@/data/mockData';

const tabs = [
  { id: 'profile', label: 'Profile', icon: FiUser },
  { id: 'preferences', label: 'Preferences', icon: FiSliders },
  { id: 'notifications', label: 'Notifications', icon: FiBell },
  { id: 'data', label: 'Data', icon: FiDatabase },
];

const LOCAL_KEYS = ['ta_prefs', 'ta_notifs', 'ta_sections', 'ta_tracking', 'ta_sidebar_collapsed'];

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [confirm, setConfirm] = useState(null); // 'reset' | null

  // Profile tab — real, editable account data (name/phone save to Supabase;
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

  const setP = (e) => {
    const { name, value } = e.target;
    setPform((f) => ({ ...f, [name]: name === 'name' ? titleCaseName(value) : value }));
  };

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
      toast.success('Email updated.');
    } catch (err) {
      setPError(err?.message || 'Invalid or expired code.');
    } finally {
      setPSaving(false);
    }
  }

  const [prefs, setPrefs] = useLocalStorage('ta_prefs', { weekStart: 'Monday', compactMode: false, timeFormat: '12h' });
  const [notifs, setNotifs] = useLocalStorage('ta_notifs', { weeklyReport: true, streakReminders: true, teamUpdates: false, productEmails: false });
  const [tracking, setTracking] = useLocalStorage('ta_tracking', { productivity: true, screenshot: false, idle: true });

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));
  const setNotif = (key, value) => setNotifs((n) => ({ ...n, [key]: value }));
  const setTrack = (key, value, label) => {
    setTracking((t) => ({ ...t, [key]: value }));
    toast.success(`${label} ${value ? 'enabled' : 'disabled'}`);
  };

  function exportCsv() {
    downloadCsv('time-auditor-logs.csv', timeEntries);
    toast.success('CSV exported');
  }
  function exportReportPdf() {
    exportPdf('Productivity Report', [{ heading: 'Time Log', rows: timeEntries }]);
    toast.info('Opening print dialog…');
  }
  function factoryReset() {
    LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
    setPrefs({ weekStart: 'Monday', compactMode: false, timeFormat: '12h' });
    setNotifs({ weeklyReport: true, streakReminders: true, teamUpdates: false, productEmails: false });
    setTracking({ productivity: true, screenshot: false, idle: true });
    setConfirm(null);
    toast.success('Factory reset complete — logs, analytics & local data cleared');
  }

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="Settings" subtitle="Manage your profile, preferences and application data" />

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
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
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input label="Display name" name="name" value={pform.name} onChange={setP} />
                <Input label="Email" type="email" name="email" value={pform.email} onChange={setP} autoComplete="off" />
                <Input label="Phone" name="phone" value={pform.phone} onChange={setP} />
                <Input
                  label="Country"
                  value={countryFromPhone(pform.phone || user?.phone) || 'Not set'}
                  readOnly
                  hint="From your phone's country code."
                />
              </div>
              <div className="mt-6 flex justify-end">
                <Button icon={FiSave} loading={pSaving} onClick={saveProfile}>
                  Save changes
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'preferences' && (
        <div className="space-y-6">
          <Card title="Account preferences" subtitle="Tailor the app to how you work">
            <div className="grid gap-6 sm:grid-cols-2">
              <Select
                label="Theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
              />
              <Select label="Week starts on" value={prefs.weekStart} onChange={(e) => setPref('weekStart', e.target.value)} options={['Monday', 'Sunday']} />
              <Select label="Time format" value={prefs.timeFormat} onChange={(e) => setPref('timeFormat', e.target.value)} options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]} />
            </div>
            <div className="mt-6 border-t border-ink-700 pt-6">
              <Toggle label="Compact mode" description="Reduce spacing to fit more on screen." checked={prefs.compactMode} onChange={(v) => setPref('compactMode', v)} />
            </div>
          </Card>

          <Card title="Tracking" subtitle="Control what Productivity Shastra monitors">
            <div className="space-y-5">
              <Toggle label={<span className="flex items-center gap-2"><FiActivity className="h-4 w-4 text-brand-400" /> Productivity Tracking</span>} description="Track active vs. idle time." checked={tracking.productivity} onChange={(v) => setTrack('productivity', v, 'Productivity tracking')} />
              <div className="border-t border-ink-700" />
              <Toggle label={<span className="flex items-center gap-2"><FiCamera className="h-4 w-4 text-brand-400" /> Screenshot Tracking</span>} description="Capture periodic activity screenshots." checked={tracking.screenshot} onChange={(v) => setTrack('screenshot', v, 'Screenshot tracking')} />
              <div className="border-t border-ink-700" />
              <Toggle label={<span className="flex items-center gap-2"><FiPauseCircle className="h-4 w-4 text-brand-400" /> Idle Detection</span>} description="Automatically detect away time." checked={tracking.idle} onChange={(v) => setTrack('idle', v, 'Idle detection')} />
            </div>
          </Card>
        </div>
      )}

      {tab === 'notifications' && (
        <Card title="Notifications" subtitle="Choose what we email you about">
          <div className="space-y-5">
            <Toggle label="Weekly report" description="A productivity summary every Monday." checked={notifs.weeklyReport} onChange={(v) => setNotif('weeklyReport', v)} />
            <div className="border-t border-ink-700" />
            <Toggle label="Streak reminders" description="Nudges to keep your daily streak alive." checked={notifs.streakReminders} onChange={(v) => setNotif('streakReminders', v)} />
            <div className="border-t border-ink-700" />
            <Toggle label="Team updates" description="When teammates request approvals." checked={notifs.teamUpdates} onChange={(v) => setNotif('teamUpdates', v)} />
            <div className="border-t border-ink-700" />
            <Toggle label="Product emails" description="News, tips and feature announcements." checked={notifs.productEmails} onChange={(v) => setNotif('productEmails', v)} />
          </div>
        </Card>
      )}

      {tab === 'data' && (
        <Card title="Data management" subtitle="Export, clean up or reset your data">
          <div className="space-y-4">
            <Row
              title="Export as CSV"
              desc="Download your time logs as a spreadsheet."
              action={<Button variant="outline" size="sm" icon={FiDownload} onClick={exportCsv}>Export CSV</Button>}
            />
            <Row
              title="Export as PDF"
              desc="Generate a printable productivity report."
              action={<Button variant="outline" size="sm" icon={FiFileText} onClick={exportReportPdf}>Export PDF</Button>}
            />
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4">
              <Row
                title={<span className="text-brand-300">Factory reset</span>}
                desc="Delete all logs, reset analytics and clear local data. This cannot be undone."
                action={<Button variant="danger" size="sm" icon={FiRefreshCw} onClick={() => setConfirm('reset')}>Factory reset</Button>}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation modals */}
      <Modal
        open={confirm === 'reset'}
        onClose={() => setConfirm(null)}
        title="Factory reset?"
        icon={FiRefreshCw}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={factoryReset}>Reset everything</Button>
          </>
        }
      >
        This deletes <strong>all logs</strong>, resets analytics, and clears local data (preferences,
        toggles, notifications). This action cannot be undone.
      </Modal>
    </div>
  );
}

function Row({ title, desc, action }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ink-800 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-fg">{title}</p>
        <p className="text-sm text-ink-400">{desc}</p>
      </div>
      {action}
    </div>
  );
}
