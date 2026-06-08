import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiMail, FiPhone, FiMapPin, FiBriefcase, FiCalendar, FiEdit2, FiSave, FiAward, FiClock, FiTrendingUp, FiHash,
} from 'react-icons/fi';
import { Card, Avatar, Badge, Button, Input, PageHeader, BackButton } from '@/components/ui';
import { updateProfile } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, titleCaseName } from '@/utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    title: user?.title || '',
    department: user?.department || '',
    phone: user?.phone || '+1 555 0142',
    country: user?.country || 'United States',
  });

  const update = (e) => {
    const { name, value } = e.target;
    const next = name === 'name' ? titleCaseName(value) : value;
    setForm((f) => ({ ...f, [name]: next }));
  };

  async function save() {
    setSaving(true);
    const updated = await updateProfile(form);
    setUser((u) => ({ ...u, ...updated }));
    setSaving(false);
    setEditing(false);
  }

  const stats = [
    { icon: FiClock, label: 'Hours logged', value: '1,245' },
    { icon: FiTrendingUp, label: 'Avg. productivity', value: '78%' },
    { icon: FiAward, label: 'Current level', value: `Lvl ${user?.level || 12}` },
  ];

  const details = [
    { icon: FiMail, label: 'Email', value: user?.email },
    { icon: FiHash, label: 'Client ID', value: user?.clientId || '—' },
    { icon: FiPhone, label: 'Phone', value: form.phone },
    { icon: FiBriefcase, label: 'Department', value: form.department || 'Design' },
    { icon: FiMapPin, label: 'Country', value: form.country },
    { icon: FiCalendar, label: 'Joined', value: formatDate(user?.joined || '2024-03-14') },
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
              <h2 className="text-xl font-bold text-white">{form.name}</h2>
              <p className="text-sm text-ink-400">{form.title || 'Senior Product Designer'}</p>
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
          <Button
            variant={editing ? 'primary' : 'outline'}
            icon={editing ? FiSave : FiEdit2}
            loading={saving}
            onClick={() => (editing ? save() : setEditing(true))}
          >
            {editing ? 'Save changes' : 'Edit profile'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Stats */}
        <div className="space-y-5 lg:col-span-1">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card flex items-center gap-4 p-5"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                <s.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-ink-400">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Details / edit form */}
        <Card title="Personal information" className="lg:col-span-2">
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" name="name" value={form.name} onChange={update} />
              <Input label="Job title" name="title" value={form.title} onChange={update} />
              <Input label="Department" name="department" value={form.department} onChange={update} />
              <Input label="Phone" name="phone" value={form.phone} onChange={update} />
              <Input label="Country" name="country" value={form.country} onChange={update} className="sm:col-span-2" />
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
                    <dd className="text-slate-200">{d.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}
