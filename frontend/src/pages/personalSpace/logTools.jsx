import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiSave, FiX } from 'react-icons/fi';
import { Button, Card } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { AutoAddSelect, StatusButtons, HHMMInput, Field } from '@/components/ps/fields.jsx';
import EntryLog from '@/components/ps/EntryLog.jsx';
import { useLog } from '@/components/ps/useLog.js';
import { todayISO, INSTANCE_OPTIONS } from '@/services/personalSpaceService';

const inputCls = (err) => cn('input-base', err && 'border-brand-500');

function FormCard({ children, onSubmit }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card>
        <form onSubmit={onSubmit} className="space-y-6">
          {children}
        </form>
      </Card>
    </motion.div>
  );
}

function meta(entry) {
  return new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ───────────────────────────── Insights Illuminator ───────────────────────── */
export function InsightsIlluminator() {
  const toast = useToast();
  const { entries, add, remove } = useLog('insights-illuminator', (d) => d.insight);
  const [form, setForm] = useState({ insight: '', action: '', date: todayISO() });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.insight.trim()) errs.insight = 'Required';
    if (!form.action.trim()) errs.action = 'Required';
    if (!form.date) errs.date = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await add({ ...form, insight: form.insight.trim(), action: form.action.trim() });
    setForm({ insight: '', action: '', date: todayISO() });
    toast.success('Insight saved');
  }

  return (
    <>
      <FormCard onSubmit={submit}>
        <Field label="Insight" required error={errors.insight}>
          <textarea
            value={form.insight}
            onChange={(e) => set('insight', e.target.value)}
            placeholder="What clicked?"
            className={cn('input-base min-h-[100px] resize-y', errors.insight && 'border-brand-500')}
          />
        </Field>
        <Field label="New Action to Take" required error={errors.action}>
          <textarea
            value={form.action}
            onChange={(e) => set('action', e.target.value)}
            placeholder="Turn the insight into a concrete action…"
            className={cn('input-base min-h-[90px] resize-y', errors.action && 'border-brand-500')}
          />
        </Field>
        <Field label="Date" required error={errors.date}>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date)} />
        </Field>
        <div className="flex justify-end border-t border-ink-800 pt-5">
          <Button type="submit" icon={FiSave}>Save Insight</Button>
        </div>
      </FormCard>

      <EntryLog title="Insights" entries={entries} onDelete={remove}
        renderItem={(en) => (
          <div>
            <p className="text-sm font-semibold text-fg-strong">{en.data.insight}</p>
            <p className="mt-0.5 text-xs text-fg-muted">➜ {en.data.action}</p>
            <p className="mt-1 text-[11px] text-ink-400">🗓 {en.data.date || meta(en)}</p>
          </div>
        )}
      />
    </>
  );
}

/* ───────────────────────────── Results Recorder ───────────────────────────── */
export function ResultsRecorder() {
  const toast = useToast();
  const { entries, add, remove } = useLog('results-recorder', (d) => (d.items || []).map((i) => i.result).filter(Boolean).join(' · '));
  const [items, setItems] = useState([{ result: '', subject: '' }]);
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const setItem = (i, k, v) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addRow = () => setItems((arr) => [...arr, { result: '', subject: '' }]);
  const removeRow = (i) => setItems((arr) => (arr.length === 1 ? arr : arr.filter((_, idx) => idx !== i)));

  async function submit(e) {
    e.preventDefault();
    const clean = items.map((i) => ({ result: i.result.trim(), subject: i.subject.trim() })).filter((i) => i.result || i.subject);
    if (!clean.length || clean.some((i) => !i.result)) {
      setError('Add at least one result (Subject/Category optional).');
      return;
    }
    setError('');
    await add({ items: clean, date, notes: notes.trim() });
    setItems([{ result: '', subject: '' }]);
    setDate(todayISO());
    setNotes('');
    toast.success('Results recorded');
  }

  return (
    <>
      <FormCard onSubmit={submit}>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2">
              <Field label={i === 0 ? 'Result' : undefined} required={i === 0}>
                <input value={it.result} onChange={(e) => setItem(i, 'result', e.target.value)} placeholder="e.g. Closed 3 deals" className="input-base" />
              </Field>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={i === 0 ? 'Subject / Category' : undefined}>
                    <input value={it.subject} onChange={(e) => setItem(i, 'subject', e.target.value)} placeholder="e.g. Sales" className="input-base" />
                  </Field>
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="mb-0.5 rounded-lg p-2.5 text-ink-400 hover:bg-ink-800 hover:text-brand-400" title="Remove row">
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-400 hover:text-brand-300">
            <FiPlus className="h-4 w-4" /> Add more
          </button>
        </div>

        {error && <p className="text-xs text-brand-400">{error}</p>}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Context & lessons (optional)" className="input-base min-h-[80px] resize-y" />
        </Field>
        <div className="flex justify-end border-t border-ink-800 pt-5">
          <Button type="submit" icon={FiSave}>Save Results</Button>
        </div>
      </FormCard>

      <EntryLog title="Recorded Results" entries={entries} onDelete={remove}
        renderItem={(en) => (
          <div>
            <ul className="space-y-0.5">
              {(en.data.items || []).map((it, idx) => (
                <li key={idx} className="text-sm font-semibold text-fg-strong">
                  {it.result}
                  {it.subject && <span className="ml-1.5 text-xs font-normal text-brand-400">· {it.subject}</span>}
                </li>
              ))}
            </ul>
            {en.data.notes && <p className="mt-1 text-xs text-fg-muted">{en.data.notes}</p>}
            <p className="mt-1 text-[11px] text-ink-400">🗓 {en.data.date || meta(en)}</p>
          </div>
        )}
      />
    </>
  );
}

/* ───────────────────────────── Habit Change Register ──────────────────────── */
const HABIT_STATUSES = ['Old Stopped', 'Old Replaced', 'New Created'];

export function HabitChangeRegister() {
  const toast = useToast();
  const { entries, add, remove } = useLog('habit-change-register', (d) => `${d.status}: ${d.habit}`);
  const [form, setForm] = useState({ status: '', habit: '', date: todayISO(), notes: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.status) errs.status = 'Pick a status';
    if (!form.habit.trim()) errs.habit = 'Required';
    if (!form.date) errs.date = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await add({ ...form, habit: form.habit.trim(), notes: form.notes.trim() });
    setForm({ status: '', habit: '', date: todayISO(), notes: '' });
    toast.success('Habit change logged');
  }

  return (
    <>
      <FormCard onSubmit={submit}>
        <StatusButtons label="Status" required options={HABIT_STATUSES} value={form.status} onChange={(v) => set('status', v)} error={errors.status} />
        <Field label="Habit Change" required error={errors.habit}>
          <textarea value={form.habit} onChange={(e) => set('habit', e.target.value)} placeholder="Describe the habit you stopped, replaced or created…" className={cn('input-base min-h-[100px] resize-y', errors.habit && 'border-brand-500')} />
        </Field>
        <Field label="Date Noticed" required error={errors.date}>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date)} />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" className="input-base min-h-[80px] resize-y" />
        </Field>
        <div className="flex justify-end border-t border-ink-800 pt-5">
          <Button type="submit" icon={FiSave}>Save</Button>
        </div>
      </FormCard>

      <EntryLog title="Habit Changes" entries={entries} onDelete={remove}
        renderItem={(en) => (
          <div>
            <p className="text-sm font-semibold text-fg-strong">
              <span className="text-brand-400">{en.data.status}</span> — {en.data.habit}
            </p>
            {en.data.notes && <p className="mt-0.5 text-xs text-fg-muted">{en.data.notes}</p>}
            <p className="mt-1 text-[11px] text-ink-400">🗓 {en.data.date || meta(en)}</p>
          </div>
        )}
      />
    </>
  );
}

/* ───────────────────────────── Time Saver ──────────────────────────────────── */
const TIME_STATUSES = ['Started', 'Stopped', 'Replaced'];

export function TimeSaver() {
  const toast = useToast();
  const { entries, add, remove } = useLog('time-saver', (d) => `${d.activity} (${d.time})`);
  const [form, setForm] = useState({ status: '', date: todayISO(), activity: '', time: '', instance: '', notes: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.status) errs.status = 'Pick a status';
    if (!form.date) errs.date = 'Required';
    if (!form.activity.trim()) errs.activity = 'Required';
    if (!/^\d{1,2}:\d{2}$/.test(form.time)) errs.time = 'Enter time as HH:MM';
    if (!form.instance) errs.instance = 'Pick an instance';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await add({ ...form, activity: form.activity.trim(), notes: form.notes.trim() });
    setForm({ status: '', date: todayISO(), activity: '', time: '', instance: '', notes: '' });
    toast.success('Time saving logged');
  }

  return (
    <>
      <FormCard onSubmit={submit}>
        <StatusButtons label="Status" required options={TIME_STATUSES} value={form.status} onChange={(v) => set('status', v)} error={errors.status} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Date Noticed" required error={errors.date}>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls(errors.date)} />
          </Field>
          <HHMMInput label="Time Saving Now Possible (HH:MM)" required value={form.time} onChange={(v) => set('time', v)} error={errors.time} />
        </div>
        <Field label="Activity that has saved time" required error={errors.activity}>
          <input value={form.activity} onChange={(e) => set('activity', e.target.value)} placeholder="e.g. Automated invoice reminders" className={inputCls(errors.activity)} />
        </Field>
        <Field label="Instance" required error={errors.instance}>
          <select value={form.instance} onChange={(e) => set('instance', e.target.value)} className={inputCls(errors.instance)}>
            <option value="" disabled>Select…</option>
            {INSTANCE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes…" className="input-base min-h-[80px] resize-y" />
        </Field>
        <div className="flex justify-end border-t border-ink-800 pt-5">
          <Button type="submit" icon={FiSave}>Save</Button>
        </div>
      </FormCard>

      <EntryLog title="Time Savings" entries={entries} onDelete={remove}
        renderItem={(en) => (
          <div>
            <p className="text-sm font-semibold text-fg-strong">
              <span className="text-brand-400">{en.data.status}</span> — {en.data.activity}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
              <span>⏱ {en.data.time}</span>
              {en.data.instance && <span>🔁 {en.data.instance}</span>}
              <span>🗓 {en.data.date || meta(en)}</span>
            </div>
            {en.data.notes && <p className="mt-1 text-xs text-fg-muted">{en.data.notes}</p>}
          </div>
        )}
      />
    </>
  );
}
