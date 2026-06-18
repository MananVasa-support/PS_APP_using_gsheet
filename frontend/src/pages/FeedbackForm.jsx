import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiSave } from 'react-icons/fi';
import { BackButton, Button, Card, PageHeader } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { StatusButtons, PointScale, Field } from '@/components/ps/fields.jsx';
import { useLog } from '@/components/ps/useLog.js';
import { todayISO } from '@/services/personalSpaceService';

const INTERACTION_CLASSES = ['HH Call', 'Session'];
const CONSULTANTS = ['Ruchita', 'Sanket', 'Jeevan', 'Rutvisha', 'Rohan', 'Mishtie', 'Kiran'];
const SERVICES = ['Productivity Shastra', 'Business Scale Up Shastra', 'Sustainability Shastra', 'Consulting', 'Other'];

const EMPTY = {
  date: todayISO(),
  interaction: '',
  consultant: '',
  fullName: '',
  service: '',
  serviceOther: '',
  overall: null,
  ability: null,
  improvements: '',
};

/**
 * Feedback Form — the Hand-Holding Call feedback set (from the workshop
 * participant template). A standardized facilitator↔participant verification
 * touchpoint after a call or session.
 */
export default function FeedbackForm() {
  const toast = useToast();
  const navigate = useNavigate();
  const { add } = useLog('feedback-form', (d) => `${d.consultant || d.interaction} · ${d.overall ?? '—'}/5`);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.date) errs.date = 'Required';
    if (!form.interaction) errs.interaction = 'Pick one';
    if (!form.consultant) errs.consultant = 'Select a consultant';
    if (!form.fullName.trim()) errs.fullName = 'Required';
    if (!form.service) errs.service = 'Pick one';
    if (form.service === 'Other' && !form.serviceOther.trim()) errs.serviceOther = 'Please specify';
    if (form.overall == null) errs.overall = 'Give a score';
    if (form.ability == null) errs.ability = 'Give a score';
    if (!form.improvements.trim()) errs.improvements = 'Required';
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please complete all fields.');
      return;
    }
    await add({
      ...form,
      fullName: form.fullName.trim(),
      serviceOther: form.serviceOther.trim(),
      improvements: form.improvements.trim(),
    });
    setForm(EMPTY);
    toast.success('Feedback submitted');
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/dashboard')} />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <FiMessageCircle className="h-5 w-5" />
            </span>
            Feedback Form ©
          </span>
        }
        subtitle="Hand-Holding Call feedback — review the efficacy of a call or session."
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Date" required error={errors.date}>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input-base" />
              </Field>

              <Field label="Consultant Name" required error={errors.consultant}>
                <select
                  value={form.consultant}
                  onChange={(e) => set('consultant', e.target.value)}
                  className={cn('input-base', errors.consultant && 'border-brand-500')}
                >
                  <option value="" disabled>Select a consultant…</option>
                  {CONSULTANTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>

            <StatusButtons
              label="Interaction Class"
              required
              options={INTERACTION_CLASSES}
              value={form.interaction}
              onChange={(v) => set('interaction', v)}
              error={errors.interaction}
            />

            <Field label="Full Name" required error={errors.fullName}>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="Participant's full name"
                className={cn('input-base', errors.fullName && 'border-brand-500')}
              />
            </Field>

            <div>
              <StatusButtons
                label="Service"
                required
                options={SERVICES}
                value={form.service}
                onChange={(v) => set('service', v)}
                error={errors.service}
              />
              {form.service === 'Other' && (
                <input
                  type="text"
                  value={form.serviceOther}
                  onChange={(e) => set('serviceOther', e.target.value)}
                  placeholder="Please specify…"
                  className={cn('input-base mt-2', errors.serviceOther && 'border-brand-500')}
                />
              )}
              {errors.serviceOther && <p className="mt-1.5 text-xs text-brand-400">{errors.serviceOther}</p>}
            </div>

            <PointScale
              label="Please Rate your Overall Hand-holding Experience today"
              required
              value={form.overall}
              onChange={(v) => set('overall', v)}
              min={0}
              max={5}
              error={errors.overall}
            />

            <PointScale
              label="Please Rate the Consultant's Ability & Communication to resolve your concerns"
              required
              value={form.ability}
              onChange={(v) => set('ability', v)}
              min={0}
              max={5}
              error={errors.ability}
            />

            <Field
              label="What would make your Hand-Holding experience & the consultant's efficiency better? Share any suggestions, support needed, or anything you'd have liked to cover but didn't."
              required
              error={errors.improvements}
            >
              <textarea
                value={form.improvements}
                onChange={(e) => set('improvements', e.target.value)}
                placeholder="Your detailed feedback…"
                className={cn('input-base min-h-[120px] resize-y', errors.improvements && 'border-brand-500')}
              />
            </Field>

            <div className="flex justify-end border-t border-ink-800 pt-5">
              <Button type="submit" icon={FiSave}>Submit Feedback</Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
