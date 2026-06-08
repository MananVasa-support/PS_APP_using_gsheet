import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiBell, FiPlus, FiTrash2, FiCheckCircle, FiClock } from 'react-icons/fi';
import { Button, Card, Input, PageHeader, Badge } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { MANDATORY_MSG, FIELD_REQUIRED_MSG, isEmptyValue } from '@/utils/validation';

const STORAGE_KEY = 'ps_reminders';

function loadReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Reminder() {
  const toast = useToast();
  const [reminders, setReminders] = useState(loadReminders);
  const [form, setForm] = useState({ title: '', date: '', time: '' });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  const isComplete = !isEmptyValue(form.title) && !isEmptyValue(form.date) && !isEmptyValue(form.time);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders]);

  function addReminder(e) {
    e.preventDefault();
    const next = {};
    if (isEmptyValue(form.title)) next.title = FIELD_REQUIRED_MSG;
    if (isEmptyValue(form.date)) next.date = FIELD_REQUIRED_MSG;
    if (isEmptyValue(form.time)) next.time = FIELD_REQUIRED_MSG;
    if (Object.keys(next).length) {
      setErrors(next);
      setGlobalError(MANDATORY_MSG);
      toast.error(MANDATORY_MSG);
      return;
    }
    setErrors({});
    setGlobalError('');
    setReminders((list) => [
      {
        id: `${Date.now()}`,
        title: form.title.trim(),
        date: form.date,
        time: form.time,
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...list,
    ]);
    setForm({ title: '', date: '', time: '' });
    toast.success('Reminder added.');
  }

  const updateField = (key) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [key]: v }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    if (globalError) setGlobalError('');
  };

  function toggleDone(id) {
    setReminders((list) => list.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  }

  function removeReminder(id) {
    setReminders((list) => list.filter((r) => r.id !== id));
    toast.info('Reminder removed.');
  }

  return (
    <div className="space-y-6">
      <Button as={Link} to="/dashboard" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader title="Reminder" subtitle="Quick notes for things you want to remember." />

      <Card title="Add a reminder">
        {globalError && (
          <div className="mb-3 rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
            {globalError}
          </div>
        )}
        <form onSubmit={addReminder} className="grid gap-3 sm:grid-cols-[1fr,160px,140px,auto] sm:items-end">
          <Input
            label={<>Title <span className="text-brand-400">*</span></>}
            name="title"
            value={form.title}
            onChange={updateField('title')}
            placeholder="e.g. Follow up with Naresh"
            error={errors.title}
            required
          />
          <Input
            label={<>Date <span className="text-brand-400">*</span></>}
            name="date"
            type="date"
            value={form.date}
            onChange={updateField('date')}
            error={errors.date}
            required
          />
          <Input
            label={<>Time <span className="text-brand-400">*</span></>}
            name="time"
            type="time"
            value={form.time}
            onChange={updateField('time')}
            error={errors.time}
            required
          />
          <Button type="submit" icon={FiPlus} disabled={!isComplete}>Add</Button>
        </form>
      </Card>

      <Card
        title={<span className="flex items-center gap-2"><FiBell className="text-brand-400" /> Your reminders</span>}
        subtitle={`${reminders.length} total`}
      >
        {reminders.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-400">No reminders yet. Add one above.</p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {reminders.map((r) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/40 p-3"
                >
                  <button
                    onClick={() => toggleDone(r.id)}
                    aria-label={r.done ? 'Mark not done' : 'Mark done'}
                    className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${r.done ? 'bg-brand-500/20 text-brand-400' : 'bg-ink-800 text-ink-400 hover:text-slate-200'}`}
                  >
                    <FiCheckCircle className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${r.done ? 'text-ink-500 line-through' : 'text-slate-200'}`}>
                      {r.title}
                    </p>
                    {(r.date || r.time) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                        <FiClock className="h-3 w-3" />
                        {r.date} {r.time}
                      </p>
                    )}
                  </div>
                  {r.done && <Badge tone="success">Done</Badge>}
                  <button
                    onClick={() => removeReminder(r.id)}
                    aria-label="Delete reminder"
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-unproductive/10 hover:text-unproductive"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
}
