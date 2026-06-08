import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiArrowRight,
  FiStopCircle,
  FiCheckCircle,
  FiPlay,
  FiCheck,
  FiPlus,
} from 'react-icons/fi';
import clsx from 'clsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Card from '@/features/reason-eliminator/components/common/Card.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import InlineError from '@/features/reason-eliminator/components/common/InlineError.jsx';
import FlowFooter from '../components/FlowFooter.jsx';
import CategorySelector from '../components/CategorySelector.jsx';
import {
  SESSION_STATUS,
  CATEGORY_BY_ID,
  CATEGORY_DETAILS,
} from '../constants.js';
import { reasonNumber } from '../utils/formatters.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';

// A reason is fully assessed when it has at least one category AND at least one
// subcategory (detail) belonging to a selected category. Read-only — mirrors
// the existing per-reason rules without changing any selection logic.
function reasonCompleteness(r) {
  const cats = Array.isArray(r?.categories) ? r.categories : [];
  const detailIds = cats.flatMap((cid) =>
    (CATEGORY_DETAILS[cid] || []).map((o) => o.id)
  );
  const details = Array.isArray(r?.details) ? r.details : [];
  const hasCat = cats.length > 0;
  const hasSub = details.some((id) => detailIds.includes(id));
  return { hasCat, hasSub, complete: hasCat && hasSub };
}

export default function AssessmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    reasons: rawReasons,
    hasActiveSession,
    toggleCategory,
    toggleDetail,
    persist,
    setStatus,
    recordFlowReturn,
  } = useAssessmentFlow();

  // Archived reasons keep all their saved data but drop out of the active flow,
  // so the user is never re-asked for them. Everything below numbers/iterates
  // active reasons only, so the sequence stays R1, R2, ... with no gaps.
  const reasons = useMemo(
    () => rawReasons.filter((r) => !r.archived),
    [rawReasons]
  );

  const [cursor, setCursor] = useState(0);
  // When the Power Word screen sends the user back via "Previous", it passes
  // { ended: true } so we open directly on the Assessment Ended screen.
  const [ended, setEnded] = useState(Boolean(location.state?.ended));
  const [showComplete, setShowComplete] = useState(false);
  const [resumed, setResumed] = useState(false);
  // Set when the user tries to continue (Next / End) without choosing a
  // reason detail, so a "required" message shows. Auto-hides once one is ticked.
  const [attempted, setAttempted] = useState(false);
  // Which category's subcategory panel is currently shown. Display-only — the
  // actual subcategory selections live on the reason and are never cleared by
  // switching the visible panel.
  const [activeCategory, setActiveCategory] = useState(null);
  // When End Assessment is blocked by an unfinished reason, holds the target
  // reason index + the warning message. null = popup closed.
  const [endWarn, setEndWarn] = useState(null);
  // Warning when the user tries to pick another category while a selected one
  // still has no subcategory. Holds the message string. null = popup closed.
  const [subcatWarn, setSubcatWarn] = useState(null);

  // On mount, resume from the first reason that still has no category.
  // This is what lets the user go back, edit/add reasons, and return
  // without restarting — completed selections are kept and we jump to
  // the next pending reason (newly added reasons sit at the end).
  useEffect(() => {
    const firstUncategorized = reasons.findIndex(
      (r) => !Array.isArray(r.categories) || r.categories.length === 0
    );
    if (firstUncategorized > 0) {
      setCursor(firstUncategorized);
      setResumed(true);
    } else if (firstUncategorized === -1 && reasons.length > 0) {
      // Every reason is already categorized — returning here should stay on the
      // last completed reason, not reset back to R1.
      setCursor(reasons.length - 1);
      setResumed(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = reasons.length;
  const current = reasons[cursor];
  const completedCount = useMemo(
    () =>
      reasons.filter(
        (r) => Array.isArray(r.categories) && r.categories.length > 0
      ).length,
    [reasons]
  );
  const progress = useMemo(
    () => (total ? Math.round((completedCount / total) * 100) : 0),
    [completedCount, total]
  );

  // When the shown reason changes, default the open panel to its last selected
  // category (or none) — selections stay saved and simply re-display.
  useEffect(() => {
    const cats = Array.isArray(current?.categories) ? current.categories : [];
    setActiveCategory(cats.length ? cats[cats.length - 1] : null);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety net: if the reason list shrinks (e.g. a reason was deleted), keep
  // the cursor in range so a valid reason always renders — never a blank card.
  useEffect(() => {
    if (total > 0 && cursor > total - 1) setCursor(total - 1);
  }, [total, cursor]);

  if (!hasActiveSession || total === 0) {
    return <Navigate to="/reason-eliminator" replace />;
  }

  const isLast = cursor >= total - 1;

  const handleToggle = (catId) => {
    if (!current) return;
    const selected = Array.isArray(current.categories)
      ? current.categories
      : [];
    const wasSelected = selected.includes(catId);
    // When ADDING another category, every already-selected category must have
    // at least one subcategory first. Deselecting is always allowed.
    if (!wasSelected) {
      const details = Array.isArray(current.details) ? current.details : [];
      const incompleteCatId = selected.find((cid) => {
        const optIds = (CATEGORY_DETAILS[cid] || []).map((o) => o.id);
        return !details.some((d) => optIds.includes(d));
      });
      if (incompleteCatId) {
        const cat = CATEGORY_BY_ID[incompleteCatId];
        setSubcatWarn(
          `Please select at least one subcategory for ${
            cat?.label || 'this category'
          } first.`
        );
        return; // Block the new category selection; keep existing selections.
      }
    }
    toggleCategory(current.id, catId);
    // Show only the just-clicked category's panel. When a category is
    // deselected, close its panel (its saved subcategories are kept intact).
    setActiveCategory((prev) =>
      wasSelected ? (prev === catId ? null : prev) : catId
    );
  };

  const selectedCats = Array.isArray(current?.categories)
    ? current.categories
    : [];
  // Detail options visible right now = those belonging to a selected category.
  const visibleDetailIds = selectedCats.flatMap((cid) =>
    (CATEGORY_DETAILS[cid] || []).map((o) => o.id)
  );
  const currentDetails = Array.isArray(current?.details) ? current.details : [];
  // Count only ticked details that belong to a currently-selected category.
  const hasDetail = currentDetails.some((id) => visibleDetailIds.includes(id));
  // Only show the warning after a blocked attempt; it clears the moment a
  // reason detail is ticked (hasDetail becomes true).
  const showError = attempted && !hasDetail;

  const handleNext = () => {
    if (!hasDetail) {
      setAttempted(true);
      return;
    }
    setAttempted(false);
    if (isLast) {
      setStatus(SESSION_STATUS.ASSESSED);
      persist({ status: SESSION_STATUS.ASSESSED });
      setShowComplete(true);
      return;
    }
    // Save progress after every reason so nothing is lost on reload.
    persist();
    setCursor((c) => c + 1);
  };

  const handleEndAssessment = () => {
    // Before ending, every reason must have a category and a subcategory.
    // Find the first one that doesn't and warn instead of ending.
    const firstIncomplete = reasons.findIndex(
      (r) => !reasonCompleteness(r).complete
    );
    if (firstIncomplete !== -1) {
      const r = reasons[firstIncomplete];
      const { hasCat } = reasonCompleteness(r);
      const missing = hasCat ? 'category and subcategory' : 'category';
      setEndWarn({
        index: firstIncomplete,
        message: `Please complete ${missing} selection for ${reasonNumber(
          r,
          firstIncomplete
        )} first.`,
      });
      return;
    }
    persist();
    setEnded(true);
  };

  // "Previous" during the assessment: step back one reason (R2 -> R1),
  // keeping every saved Category/Subcategory selection. Only when already on
  // the first reason does it leave the assessment and return to the Reasons
  // section (so the user can edit or add reasons), resuming here on return.
  const handlePrevious = () => {
    persist();
    if (cursor > 0) {
      setAttempted(false);
      setCursor((c) => c - 1);
      return;
    }
    // On the first reason — go back to the Reasons section as before.
    recordFlowReturn('/reason-eliminator/assess');
    navigate('/reason-eliminator/reasons');
  };

  // From the "Assessment Ended" screen: go back into the assessment, landing on
  // the last reason — all its selected Categories/Subcategories stay intact.
  const handleBackFromEnded = () => {
    setEnded(false);
    setAttempted(false);
    setCursor(Math.max(0, total - 1));
  };

  if (ended) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto">
          {/* Heading — matches the New Assessment first-reason screen. */}
          <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
            Assessment Ended
          </h1>
          <p className="mt-2 text-sm text-brand-gray-900">
            Move on to the next step to replace each Reason with a Power Word.
          </p>

          <div className="surface-card mt-8 p-6 md:p-8">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-red-soft text-brand-red shrink-0">
                <FiCheckCircle size={22} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-red mb-1">
                  All Done
                </p>
                <p className="text-base text-brand-black">
                  You categorized all {total} Reason{total === 1 ? '' : 's'}.
                </p>
              </div>
            </div>

            {/* Footer actions — styled like the New Assessment footer. */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                leftIcon={<FiArrowLeft />}
                onClick={handleBackFromEnded}
              >
                Previous
              </Button>
              <Button
                leftIcon={<FiPlay />}
                onClick={() => navigate('/reason-eliminator/power-word')}
              >
                Start Power Word Exercise
              </Button>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
            Assessment
          </h1>
          <p className="mt-2 text-sm text-brand-gray-900">
            Pick the Category that best explains why this Reason is stopping
            you.
          </p>
        </div>

        {resumed && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl border border-brand-gray-200 bg-brand-gray-50 px-4 py-2.5 text-sm text-brand-gray-600"
          >
            <FiPlay className="shrink-0 text-brand-red" />
            <span>
              Resuming where you left off — your completed Categories are
              saved.
            </span>
          </motion.div>
        )}

        <div className="mb-5">
          <div className="flex items-center justify-between text-sm text-brand-gray-900 mb-2">
            <span>
              Reason {cursor + 1} of {total}
            </span>
            <span>
              {completedCount} of {total} categorized · {progress}%
            </span>
          </div>
          <div className="h-1.5 bg-brand-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-red"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 28 }}
            />
          </div>
        </div>

        <Card className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <div className="flex items-start gap-3 mb-6">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-red text-white font-bold shadow-sm shadow-brand-red/20">
                    {reasonNumber(current, cursor)}
                  </span>
                  <div>
                    <p className="text-sm uppercase tracking-widest text-brand-red font-semibold">
                      Your Reason
                    </p>
                    <p className="mt-1 text-xl md:text-2xl font-semibold text-brand-black leading-snug">
                      {current.text}
                    </p>
                  </div>
                </div>

                <CategorySelector
                  value={current.categories}
                  onToggle={handleToggle}
                />
                <p className="mt-3 text-sm text-brand-gray-900">
                  Select one or more Categories.
                </p>

                {selectedCats.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {selectedCats
                      .map((cid) => {
                      const cat = CATEGORY_BY_ID[cid];
                      const opts = CATEGORY_DETAILS[cid] || [];
                      if (!cat || opts.length === 0) return null;
                      return (
                        <div key={cid}>
                          <p className="mb-2 text-sm font-semibold text-brand-black">
                            {cat.label}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {opts.map((o) => {
                              const checked = currentDetails.includes(o.id);
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  role="checkbox"
                                  aria-checked={checked}
                                  onClick={() => toggleDetail(current.id, o.id)}
                                  className={clsx(
                                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                                    checked
                                      ? 'border-brand-red bg-brand-red-soft text-brand-black'
                                      : 'border-brand-gray-200 bg-white text-brand-ink hover:border-brand-gray-300 hover:bg-brand-gray-50'
                                  )}
                                >
                                  <span
                                    className={clsx(
                                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                      checked
                                        ? 'border-brand-red bg-brand-red text-white'
                                        : 'border-brand-gray-300'
                                    )}
                                  >
                                    {checked ? <FiCheck size={12} /> : null}
                                  </span>
                                  <span>{o.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <InlineError
                  message={
                    showError
                      ? 'Please select at least one Subcategory.'
                      : null
                  }
                />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <FlowFooter
            left={
              <Button
                variant="primary"
                leftIcon={<FiArrowLeft />}
                onClick={handlePrevious}
              >
                Previous
              </Button>
            }
            right={
              <>
                <Button
                  variant="secondary"
                  leftIcon={<FiStopCircle />}
                  onClick={handleEndAssessment}
                >
                  End Assessment
                </Button>
                <Button
                  onClick={handleNext}
                  rightIcon={<FiArrowRight />}
                >
                  Next
                </Button>
              </>
            }
          />
        </Card>
      </div>

      <Modal
        open={showComplete}
        onClose={() => {
          setShowComplete(false);
          setEnded(true);
        }}
        title="Today's reasons are complete."
        description="You can add more Reasons or move on to the Power Word Exercise."
        footer={
          <>
            <Button
              variant="secondary"
              leftIcon={<FiPlus />}
              onClick={() => {
                setShowComplete(false);
                navigate('/reason-eliminator/new');
              }}
            >
              Add New Reason
            </Button>
            <Button
              leftIcon={<FiStopCircle />}
              onClick={() => {
                setShowComplete(false);
                setEnded(true);
              }}
            >
              End Assessment
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 text-brand-gray-600">
          <div className="w-10 h-10 rounded-full bg-brand-red-soft text-brand-red flex items-center justify-center">
            <FiCheckCircle size={20} />
          </div>
          <p className="text-sm">
            You categorized all {total} Reason{total === 1 ? '' : 's'}.
          </p>
        </div>
      </Modal>

      <Modal
        open={!!endWarn}
        onClose={() => setEndWarn(null)}
        title="Assessment Incomplete"
        size="sm"
        footer={
          <Button
            onClick={() => {
              // Save current progress, then jump straight to the first
              // incomplete reason — all earlier selections stay intact.
              persist();
              const idx = endWarn?.index ?? 0;
              setEndWarn(null);
              setAttempted(false);
              setCursor(idx);
            }}
            rightIcon={<FiArrowRight />}
          >
            Continue Assessment
          </Button>
        }
      >
        <p className="text-sm text-brand-gray-900">{endWarn?.message}</p>
      </Modal>

      <Modal
        open={!!subcatWarn}
        onClose={() => setSubcatWarn(null)}
        title="Subcategory Required"
        size="sm"
        footer={<Button onClick={() => setSubcatWarn(null)}>OK</Button>}
      >
        <p className="text-sm text-brand-gray-900">{subcatWarn}</p>
      </Modal>
    </PageTransition>
  );
}
