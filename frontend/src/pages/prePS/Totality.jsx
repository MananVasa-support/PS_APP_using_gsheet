import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiSave,
  FiCalendar,
  FiCheck,
  FiTrash2,
  FiPlus,
  FiChevronDown,
  FiRotateCcw,
} from 'react-icons/fi';
import { BackButton, Button, Card, PageHeader } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/cn';
import { titleCaseName } from '@/utils/format';
import { MANDATORY_MSG } from '@/utils/validation';
import {
  FREQUENCY_OPTIONS,
  listTasks,
  saveTask,
  setTaskStatus,
  deleteTask,
  fromRow,
  getOptions,
  addOption,
  getUpcomingWeeks,
  injectIntoPowerPlanner,
} from '@/services/totalityService';

const PRIORITY_OPTIONS = ['A', 'B', 'C'];

const EMPTY_FORM = {
  subject: '',
  thingToGetDone: '',
  frequency: '',
  priority: '',
  targetDate: '',
  doer: '',
  notes: '',
  schedule: '',
  moveWeek: '',
};

/**
 * A text input + dropdown that lets the user PICK an existing option or TYPE a
 * new one to add on the fly ("auto add"). Themed for the dark/light shell.
 */
function AutoAddSelect({ label, required, value, options, placeholder, onChange, transform }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const query = value.trim().toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(query));
  const exactMatch = options.some((o) => o.toLowerCase() === query);
  const canAdd = query.length > 0 && !exactMatch;

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-fg-muted">
        {label} {required && <span className="text-brand-400">*</span>}
      </label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="input-base pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-400 hover:text-fg-strong"
          aria-label="Toggle options"
        >
          <FiChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (filtered.length > 0 || canAdd) && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-ink-700 bg-ink-850 py-1 shadow-card">
          {filtered.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => pick(o)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-ink-800',
                  o === value ? 'text-fg-strong' : 'text-fg-muted'
                )}
              >
                {o}
                {o === value && <FiCheck className="h-4 w-4 text-brand-400" />}
              </button>
            </li>
          ))}
          {canAdd && (
            <li>
              <button
                type="button"
                onClick={() => pick(value.trim())}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-brand-400 transition-colors hover:bg-ink-800"
              >
                <FiPlus className="h-4 w-4" /> Add “{value.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function Totality() {
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState({ subjects: [], doers: [] });
  const [tasks, setTasks] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [busy, setBusy] = useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Initial hydration: option lists, the task list, and the 4 upcoming weeks.
  useEffect(() => {
    let active = true;
    (async () => {
      const [opts, list, wks] = await Promise.all([
        getOptions().catch(() => ({ subjects: [], doers: [] })),
        listTasks().catch(() => []),
        getUpcomingWeeks().catch(() => []),
      ]);
      if (!active) return;
      setOptions(opts);
      setTasks(list);
      setWeeks(wks);
    })();
    return () => {
      active = false;
    };
  }, []);

  const requiredFilled =
    form.subject.trim() &&
    form.thingToGetDone.trim() &&
    form.frequency &&
    form.priority &&
    form.targetDate &&
    form.doer.trim();

  function validate() {
    const next = {};
    if (!form.subject.trim()) next.subject = 'Subject is required';
    if (!form.thingToGetDone.trim()) next.thingToGetDone = 'This is required';
    if (!form.frequency) next.frequency = 'Pick a frequency';
    if (!form.priority) next.priority = 'Pick a priority';
    if (!form.targetDate) next.targetDate = 'Target date is required';
    if (!form.doer.trim()) next.doer = 'Doer is required';
    return next;
  }

  // Make sure any freshly typed Subject / Doer is remembered for next time.
  async function rememberOptions() {
    let opts = options;
    opts = await addOption('subjects', form.subject, opts);
    opts = await addOption('doers', form.doer, opts);
    setOptions(opts);
  }

  async function refreshTasks() {
    setTasks(await listTasks().catch(() => tasks));
  }

  function buildTask(extra = {}) {
    return {
      subject: form.subject.trim(),
      thingToGetDone: form.thingToGetDone.trim(),
      frequency: form.frequency,
      priority: form.priority,
      targetDate: form.targetDate,
      doer: titleCaseName(form.doer.trim()),
      notes: form.notes.trim(),
      schedule: form.schedule,
      status: 'open',
      ...extra,
    };
  }

  async function handleSave(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(MANDATORY_MSG);
      return;
    }
    setBusy(true);
    try {
      await rememberOptions();
      await saveTask(buildTask());
      await refreshTasks();
      setForm(EMPTY_FORM);
      toast.success('Task saved');
    } catch {
      toast.error('Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveToPowerPlanner() {
    const next = validate();
    if (!form.moveWeek) next.moveWeek = 'Pick a week';
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(form.moveWeek ? MANDATORY_MSG : 'Choose which week to move this to.');
      return;
    }
    setBusy(true);
    try {
      await rememberOptions();
      const task = buildTask({ movedToWeek: form.moveWeek });
      await saveTask(task);
      await injectIntoPowerPlanner(form.moveWeek, task);
      toast.success('Moved to Power Planner');
      navigate('/power-planner');
    } catch {
      toast.error('Could not move this to Power Planner.');
      setBusy(false);
    }
  }

  async function toggleDone(row) {
    const task = fromRow(row);
    const nextStatus = task.status === 'done' ? 'open' : 'done';
    // Optimistic update.
    setTasks((list) => list.map((t) => (t.id === row.id ? { ...t, status: nextStatus } : t)));
    try {
      await setTaskStatus(row, nextStatus);
    } catch {
      await refreshTasks();
      toast.error('Could not update the task.');
    }
  }

  async function removeTask(row) {
    setTasks((list) => list.filter((t) => t.id !== row.id));
    try {
      await deleteTask(row.id);
    } catch {
      await refreshTasks();
      toast.error('Could not delete the task.');
    }
  }

  const weekLabel = useMemo(() => {
    const map = {};
    weeks.forEach((w) => {
      map[w.key] = w.label;
    });
    return map;
  }, [weeks]);

  return (
    <div className="space-y-6">
      <BackButton to="/pre-ps" />

      <PageHeader title="Totality" subtitle="Capture the thing to get done" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Subject — auto-add dropdown */}
            <div>
              <AutoAddSelect
                label="Subject"
                required
                value={form.subject}
                options={options.subjects}
                placeholder="Pick or type a subject…"
                onChange={(v) => update('subject', v)}
              />
              {errors.subject && <p className="mt-1.5 text-xs text-brand-400">{errors.subject}</p>}
            </div>

            {/* Thing to Get Done — long text */}
            <div>
              <label htmlFor="thingToGetDone" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Thing to Get Done <span className="text-brand-400">*</span>
              </label>
              <textarea
                id="thingToGetDone"
                value={form.thingToGetDone}
                onChange={(e) => update('thingToGetDone', e.target.value)}
                placeholder="Describe the task in detail…"
                className={cn('input-base min-h-[120px] resize-y', errors.thingToGetDone && 'border-brand-500')}
              />
              {errors.thingToGetDone && <p className="mt-1.5 text-xs text-brand-400">{errors.thingToGetDone}</p>}
            </div>

            {/* Frequency — dropdown */}
            <div>
              <label htmlFor="frequency" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Frequency <span className="text-brand-400">*</span>
              </label>
              <select
                id="frequency"
                value={form.frequency}
                onChange={(e) => update('frequency', e.target.value)}
                className={cn('input-base', errors.frequency && 'border-brand-500')}
              >
                <option value="" disabled>
                  Select frequency…
                </option>
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              {errors.frequency && <p className="mt-1.5 text-xs text-brand-400">{errors.frequency}</p>}
            </div>

            {/* Priority — chips */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-muted">
                Priority <span className="text-brand-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((o) => {
                  const active = form.priority === o;
                  return (
                    <button
                      type="button"
                      key={o}
                      onClick={() => update('priority', o)}
                      className={cn(
                        'rounded-xl border px-5 py-2 text-sm font-bold transition',
                        active
                          ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                          : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {errors.priority && <p className="mt-1.5 text-xs text-brand-400">{errors.priority}</p>}
            </div>

            {/* Target Date + Doer */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="targetDate" className="mb-1.5 block text-sm font-medium text-fg-muted">
                  Target Date <span className="text-brand-400">*</span>
                </label>
                <input
                  id="targetDate"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => update('targetDate', e.target.value)}
                  className={cn('input-base', errors.targetDate && 'border-brand-500')}
                />
                {errors.targetDate && <p className="mt-1.5 text-xs text-brand-400">{errors.targetDate}</p>}
              </div>

              <div>
                <AutoAddSelect
                  label="Doer"
                  required
                  value={form.doer}
                  options={options.doers}
                  placeholder="Pick or type a name…"
                  transform={titleCaseName}
                  onChange={(v) => update('doer', v)}
                />
                {errors.doer && <p className="mt-1.5 text-xs text-brand-400">{errors.doer}</p>}
              </div>
            </div>

            {/* Schedule + Notes */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="schedule" className="mb-1.5 block text-sm font-medium text-fg-muted">
                  Schedule
                </label>
                <input
                  id="schedule"
                  type="datetime-local"
                  value={form.schedule}
                  onChange={(e) => update('schedule', e.target.value)}
                  className="input-base"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Notes
              </label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Optional notes…"
                className="input-base min-h-[90px] resize-y"
              />
            </div>

            {/* Move To Power Planner — next 4 weeks */}
            <div className="rounded-2xl border border-ink-800 bg-ink-900/40 p-4">
              <label htmlFor="moveWeek" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Move to Power Planner
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  id="moveWeek"
                  value={form.moveWeek}
                  onChange={(e) => update('moveWeek', e.target.value)}
                  className={cn('input-base sm:flex-1', errors.moveWeek && 'border-brand-500')}
                >
                  <option value="">Choose a week…</option>
                  {weeks.map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  icon={FiCalendar}
                  onClick={handleMoveToPowerPlanner}
                  disabled={busy || !form.moveWeek}
                  className="sm:w-auto"
                >
                  Move
                </Button>
              </div>
              {errors.moveWeek && <p className="mt-1.5 text-xs text-brand-400">{errors.moveWeek}</p>}
            </div>

            <div className="flex flex-col gap-3 border-t border-ink-800 pt-5 sm:flex-row sm:justify-end">
              <BackButton to="/pre-ps" />
              <Button type="submit" icon={FiSave} disabled={busy || !requiredFilled}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* All Tasks — list dashboard with Mark as Done */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-fg-strong">All Tasks</h2>
            <span className="text-xs text-ink-400">{tasks.length} total</span>
          </div>

          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No tasks yet — add one above.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((row) => {
                const done = (row.status || 'open') === 'done';
                return (
                  <li
                    key={row.id}
                    className={cn(
                      'flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/40 p-3 transition',
                      done && 'opacity-60'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDone(row)}
                      className={cn(
                        'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition',
                        done
                          ? 'border-transparent bg-brand-gradient text-white'
                          : 'border-ink-600 text-transparent hover:border-brand-500'
                      )}
                      aria-label={done ? 'Mark as not done' : 'Mark as done'}
                      title={done ? 'Mark as not done' : 'Mark as done'}
                    >
                      <FiCheck className="h-4 w-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm font-semibold text-fg-strong', done && 'line-through')}>
                        {row.priority && <span className="text-brand-400">({row.priority}) </span>}
                        {row.subject || 'Untitled'}
                      </p>
                      {row.thing_to_get_done && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{row.thing_to_get_done}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                        {row.doer && <span>👤 {row.doer}</span>}
                        {row.frequency && <span>🔁 {row.frequency}</span>}
                        {row.target_date && <span>🎯 {row.target_date}</span>}
                        {row.moved_to_week && (
                          <span className="text-brand-400">
                            ➜ {weekLabel[row.moved_to_week] || `Week of ${row.moved_to_week}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleDone(row)}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-fg-strong"
                        title={done ? 'Reopen' : 'Mark as done'}
                      >
                        {done ? <FiRotateCcw className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTask(row)}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-brand-400"
                        title="Delete"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
