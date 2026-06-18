import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BackButton, Card, PageHeader } from '@/components/ui';
import { cn } from '@/utils/cn';
import { PointScale, Field } from '@/components/ps/fields.jsx';
import { useLog } from '@/components/ps/useLog.js';

const VIEW_COUNTS = [1, 3, 5, 7, 10];

/**
 * My Expectations — every outcome the user has crystallised. At the end of the
 * workshop they rate each (0–5) and add reflection notes (which unlock once a
 * rating is set). "Show 1/3/5/7/10" paginates the list.
 */
export default function MyExpectations() {
  const navigate = useNavigate();
  const { entries, update, remove } = useLog('expectations-crystalliser', (d) => `${d.area}: ${d.accomplishment}`);
  const [perView, setPerView] = useState(3);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(entries.length / perView));
  const safePage = Math.min(page, pageCount - 1);
  const visible = entries.slice(safePage * perView, safePage * perView + perView);

  const setRating = (entry, rating) => update(entry.id, { ...entry.data, rating }, entry.created_at);
  const setNotes = (entry, notes) => update(entry.id, { ...entry.data, notes }, entry.created_at);

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/expectations-crystalliser')} />
      <PageHeader title="My Expectations" subtitle="All the outcomes you've locked in — rate & reflect at the end of the workshop." />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-fg-strong">{entries.length} Expectation{entries.length === 1 ? '' : 's'}</h2>
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
            <p className="py-6 text-center text-sm text-ink-400">No expectations yet — add one from Expectations Crystalliser.</p>
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
                              placeholder="Reflect on how this outcome went"
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
                  <span className="text-xs text-ink-400">{safePage + 1} / {pageCount}</span>
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
