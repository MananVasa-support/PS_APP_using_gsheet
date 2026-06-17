import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCompass, FiPlus, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BackButton, Button, Card, PageHeader } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { AutoAddSelect, PointScale, Field } from '@/components/ps/fields.jsx';
import { useLog } from '@/components/ps/useLog.js';
import { getOptionList, addToOptionList, EXPECTATION_AREAS } from '@/services/personalSpaceService';

const VIEW_COUNTS = [1, 3, 5, 7, 10];
const ACCOMPLISH_LABEL = 'What Do I want to Accomplish out of Participating in the Workshop';

/**
 * Expectations Crystalliser — first tool in the workshop flow. Participants
 * lock in the outcomes they want across business/life areas up front; at the
 * END of the workshop they rate each outcome (0–5) and add reflection notes
 * (which unlock only once a rating is set).
 */
export default function ExpectationsCrystalliser() {
  const toast = useToast();
  const { entries, add, update, remove } = useLog('expectations-crystalliser', (d) => `${d.area}: ${d.accomplishment}`);

  const [areas, setAreas] = useState(EXPECTATION_AREAS);
  const [area, setArea] = useState('');
  const [accomplishment, setAccomplishment] = useState('');
  const [errors, setErrors] = useState({});

  const [perView, setPerView] = useState(3);
  const [page, setPage] = useState(0);

  useEffect(() => {
    getOptionList('expectations_areas', EXPECTATION_AREAS).then(setAreas).catch(() => {});
  }, []);

  const pageCount = Math.max(1, Math.ceil(entries.length / perView));
  const safePage = Math.min(page, pageCount - 1);
  const visible = entries.slice(safePage * perView, safePage * perView + perView);

  async function addOutcome(e) {
    e.preventDefault();
    const errs = {};
    if (!area.trim()) errs.area = 'Pick or add an area';
    if (!accomplishment.trim()) errs.accomplishment = 'Describe what you want to accomplish';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const updated = await addToOptionList('expectations_areas', area.trim(), areas);
    setAreas(updated);
    await add({ area: area.trim(), accomplishment: accomplishment.trim(), rating: 0, notes: '' });
    setArea('');
    setAccomplishment('');
    setPage(0);
    toast.success('Expectation added');
  }

  const setRating = (entry, rating) => update(entry.id, { ...entry.data, rating }, entry.created_at);
  const setNotes = (entry, notes) => update(entry.id, { ...entry.data, notes }, entry.created_at);

  return (
    <div className="space-y-6">
      <BackButton to="/dashboard" />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <FiCompass className="h-5 w-5" />
            </span>
            Expectations Crystalliser ©
          </span>
        }
        subtitle="Lock in the outcomes you want from the workshop — rate & reflect on each at the end."
      />

      {/* Add outcome */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={addOutcome} className="space-y-5">
            <AutoAddSelect
              label="Area / Category"
              required
              value={area}
              options={areas}
              placeholder="Pick or type an area…"
              onChange={setArea}
              error={errors.area}
            />
            <Field label={ACCOMPLISH_LABEL} required error={errors.accomplishment}>
              <textarea
                value={accomplishment}
                onChange={(e) => setAccomplishment(e.target.value)}
                placeholder="What does success look like for this area?"
                className={cn('input-base min-h-[90px] resize-y', errors.accomplishment && 'border-brand-500')}
              />
            </Field>
            <div className="flex justify-end border-t border-ink-800 pt-5">
              <Button type="submit" icon={FiPlus}>Add Expectation</Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Outcomes + view controls */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-fg-strong">My Expectations</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400">Show</span>
              {VIEW_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => { setPerView(n); setPage(0); }}
                  className={cn(
                    'h-8 w-8 rounded-lg border text-xs font-semibold transition',
                    perView === n
                      ? 'border-transparent bg-brand-gradient text-white'
                      : 'border-ink-700 bg-ink-800 text-fg-muted hover:text-fg-strong'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No expectations yet — add one above.</p>
          ) : (
            <>
              <ul className="space-y-3">
                {visible.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-ink-800 bg-ink-900/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-block rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-semibold text-brand-400">
                          {entry.data.area}
                        </span>
                        <p className="mt-2 text-sm font-medium text-fg-strong">{entry.data.accomplishment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        className="shrink-0 rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-brand-400"
                        title="Delete"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* End-of-workshop reflection */}
                    <div className="mt-3 border-t border-ink-800 pt-3">
                      <PointScale
                        label="Experience Rating (end of workshop)"
                        value={entry.data.rating ?? 0}
                        onChange={(v) => setRating(entry, v)}
                        min={0}
                        max={5}
                      />
                      {(entry.data.rating || 0) > 0 && (
                        <div className="mt-3">
                          <Field label="Experience Notes">
                            <textarea
                              value={entry.data.notes || ''}
                              onChange={(e) => setNotes(entry, e.target.value)}
                              placeholder="Reflect on how this outcome went…"
                              className="input-base min-h-[80px] resize-y"
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {pageCount > 1 && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-fg-strong disabled:opacity-40"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-ink-400">
                    {safePage + 1} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePage >= pageCount - 1}
                    className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-fg-strong disabled:opacity-40"
                  >
                    <FiChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
