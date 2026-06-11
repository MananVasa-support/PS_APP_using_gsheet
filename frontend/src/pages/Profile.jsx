import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMail, FiPhone, FiMapPin, FiCalendar, FiEdit2, FiSave, FiHash, FiSettings,
} from 'react-icons/fi';
import { Card, Avatar, Badge, Button, Input, PageHeader, BackButton } from '@/components/ui';
import { updateProfile } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, titleCaseName } from '@/utils/format';

// Country isn't stored separately yet — but the signup phone carries the dial
// code (e.g. +91), so we can show the right country from it. Longest-prefix wins.
const DIAL_COUNTRIES = [
  { code: '+91', name: 'India' },
  { code: '+1', name: 'United States' },
  { code: '+44', name: 'United Kingdom' },
  { code: '+61', name: 'Australia' },
  { code: '+971', name: 'UAE' },
  { code: '+65', name: 'Singapore' },
  { code: '+49', name: 'Germany' },
  { code: '+33', name: 'France' },
  { code: '+81', name: 'Japan' },
  { code: '+86', name: 'China' },
  { code: '+92', name: 'Pakistan' },
  { code: '+880', name: 'Bangladesh' },
];
function countryFromPhone(phone) {
  if (!phone) return '';
  const byLongest = [...DIAL_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  return byLongest.find((c) => phone.startsWith(c.code))?.name || '';
}

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Only fields that actually exist as DB columns are editable here.
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const update = (e) => {
    const { name, value } = e.target;
    const next = name === 'name' ? titleCaseName(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
  };

  async function save() {
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      setUser((u) => ({ ...u, ...updated }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const country = countryFromPhone(form.phone || user?.phone);
  // Only the user's REAL account data — no placeholder stats/fields.
  const details = [
    { icon: FiMail, label: 'Email', value: user?.email || '—' },
    { icon: FiPhone, label: 'Phone', value: form.phone || user?.phone || 'Not set' },
    { icon: FiMapPin, label: 'Country', value: country || 'Not set' },
    { icon: FiCalendar, label: 'Joined', value: user?.joined ? formatDate(user.joined) : '—' },
  ];

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="My Profile" subtitle="View and manage your personal information" />

      {/* Cover + identity */}
      <Card className="overflow-hidden !p-0">
        <div className="relative h-32 bg-brand-gradient">
          <div className="absolute inset-0 bg-grid-faint [background-size:24px_24px] opacity-30" />
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar name={user?.name} src={user?.avatar} size={96} className="-mt-12 ring-4 ring-ink-850" />
            <div className="pb-1">
              <h2 className="text-xl font-bold text-fg-strong">{form.name || user?.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand" className="capitalize">{user?.role}</Badge>
                {user?.clientId && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-800 px-2.5 py-1 font-mono text-xs text-ink-300">
                    <FiHash className="h-3 w-3" /> {user.clientId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to="/settings" variant="ghost" icon={FiSettings}>
              Settings
            </Button>
            <Button
              variant={editing ? 'primary' : 'outline'}
              icon={editing ? FiSave : FiEdit2}
              loading={saving}
              onClick={() => (editing ? save() : setEditing(true))}
            >
              {editing ? 'Save changes' : 'Edit profile'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Details / edit form */}
      <Card title="Personal information">
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" name="name" value={form.name} onChange={update} />
            <Input label="Phone" name="phone" value={form.phone} onChange={update} />
          </div>
        ) : (
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {details.map((d) => (
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
        )}
      </Card>
    </div>
  );
}
