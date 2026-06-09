import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiCalendar } from 'react-icons/fi';
import { BackButton, Button, Card, Input, PageHeader } from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { titleCaseName } from '@/utils/format';
import { MANDATORY_MSG, isEmptyValue } from '@/utils/validation';

const ACTION_OPTIONS = [
  'One Time Thing',
  'Statutory Thing',
  'Standard Work',
  'Non Standard Work',
  'Business Related Thing',
  'Personal Thing',
];

const PRIORITY_OPTIONS = ['A', 'B', 'C'];

export default function Totality() {
  const toast = useToast();
  const navigate = useNavigate();
  const [, setSaved] = useLocalStorage('ta_pre_ps_totality', []);
  const [form, setForm] = useState({
    actionType: '',
    priority: '',
    targetDate: '',
    delegate: '',
    doneNotes: '',
  });
  const [errors, setErrors] = useState({});

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    const next = {};
    if (!form.actionType) next.actionType = 'Pick a type';
    if (!form.priority) next.priority = 'Pick a priority';
    if (!form.targetDate) next.targetDate = 'Target date is required';
    if (!form.delegate.trim()) next.delegate = 'Delegate is required';
    if (!form.doneNotes.trim()) next.doneNotes = 'Done notes are required';
    return next;
  }

  const isComplete =
    !!form.actionType &&
    !!form.priority &&
    !!form.targetDate &&
    !isEmptyValue(form.delegate) &&
    !isEmptyValue(form.doneNotes);

  function handleSave(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(MANDATORY_MSG);
      return;
    }

    setSaved((list) => [
      { id: `tot_${Date.now()}`, ...form, createdAt: new Date().toISOString() },
      ...list,
    ].slice(0, 100));
    toast.success('Totality entry saved');
    navigate('/pre-ps');
  }

  function handleMoveToPowerPlanner() {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(MANDATORY_MSG);
      return;
    }
    setSaved((list) => [
      { id: `tot_${Date.now()}`, ...form, movedToPlanner: true, createdAt: new Date().toISOString() },
      ...list,
    ].slice(0, 100));
    toast.success('Moved to Power Planner');
    navigate('/power-planner');
  }

  return (
    <div className="space-y-6">
      <BackButton to="/pre-ps" />

      <PageHeader title="Totality" subtitle="Capture the thing to get done" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Action Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-muted">
                Thing to get Done / Actions to get done <span className="text-brand-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTION_OPTIONS.map((o) => {
                  const active = form.actionType === o;
                  return (
                    <button
                      type="button"
                      key={o}
                      onClick={() => update('actionType', o)}
                      className={cn(
                        'rounded-xl border px-4 py-2 text-sm font-medium transition',
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
              {errors.actionType && <p className="mt-1.5 text-xs text-brand-400">{errors.actionType}</p>}
            </div>

            {/* Priority */}
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

            {/* Target Date */}
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

              <Input
                label={<>Delegate <span className="text-brand-400">*</span></>}
                name="delegate"
                value={form.delegate}
                onChange={(e) => update('delegate', titleCaseName(e.target.value))}
                placeholder="Who is responsible?"
                error={errors.delegate}
              />
            </div>

            {/* Done Notes */}
            <div>
              <label htmlFor="doneNotes" className="mb-1.5 block text-sm font-medium text-fg-muted">
                Done Notes <span className="text-brand-400">*</span>
              </label>
              <textarea
                id="doneNotes"
                value={form.doneNotes}
                onChange={(e) => update('doneNotes', e.target.value)}
                placeholder="Notes on what's been done…"
                className={cn('input-base min-h-[120px] resize-y', errors.doneNotes && 'border-brand-500')}
              />
              {errors.doneNotes && <p className="mt-1.5 text-xs text-brand-400">{errors.doneNotes}</p>}
            </div>

            {/* Move To Power Planner */}
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                icon={FiCalendar}
                onClick={handleMoveToPowerPlanner}
                className="w-full sm:w-auto"
              >
                Move To Power Planner
              </Button>
            </div>

            <div className="flex flex-col gap-3 border-t border-ink-800 pt-5 sm:flex-row sm:justify-end">
              <BackButton to="/pre-ps" />
              <Button type="submit" icon={FiSave} disabled={!isComplete}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
