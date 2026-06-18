import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiSave } from 'react-icons/fi';
import { BackButton, Button, Card, PageHeader } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { StatusButtons, PointScale, Field } from '@/components/ps/fields.jsx';
import { useLog } from '@/components/ps/useLog.js';
import { todayISO } from '@/services/personalSpaceService';

const INTERACTION_CLASSES = ['HH Call', 'Session'];

/**
 * Feedback Form — a standardized facilitator↔participant verification touchpoint
 * after a call or session. Elevated to a top-level tool (out of Personal Space).
 *
 * NOTE: the detailed question set will come from Ruchita's workshop participant
 * template — see the clearly-marked placeholder block below to wire it in later.
 */
export default function FeedbackForm() {
  const toast = useToast();
  const { add } = useLog('feedback-form', (d) => `${d.interaction} · ${d.rating}/5`);
  const [form, setForm] = useState({ date: todayISO(), interaction: '', rating: null });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.date) errs.date = 'Required';
    if (!form.interaction) errs.interaction = 'Pick one';
    if (form.rating == null) errs.rating = 'Pick a score';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    await add({ ...form });
    setForm({ date: todayISO(), interaction: '', rating: null });
    toast.success('Feedback submitted');
  }

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard" />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <FiMessageCircle className="h-5 w-5" />
            </span>
            Feedback Form ©
          </span>
        }
        subtitle="Review the efficacy of an interactive call or session."
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Date" required error={errors.date}>
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input-base" />
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

            <PointScale
              label="Evaluation"
              required
              value={form.rating}
              onChange={(v) => set('rating', v)}
              min={0}
              max={5}
              error={errors.rating}
            />

            {/* ── PLACEHOLDER: workshop feedback question set ────────────────────
                Wire the full participant question array in here when available.
                Each question can render as a rating/short-answer row and be
                saved into the entry's `data.responses`. */}
            <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-4">
              <p className="text-sm font-semibold text-fg-strong">Workshop Feedback Questions</p>
              <p className="mt-1 text-xs text-ink-400">
                📋 Placeholder — the workshop question set will be imported here.
              </p>
            </div>

            <div className="flex justify-end border-t border-ink-800 pt-5">
              <Button type="submit" icon={FiSave}>Submit Feedback</Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
