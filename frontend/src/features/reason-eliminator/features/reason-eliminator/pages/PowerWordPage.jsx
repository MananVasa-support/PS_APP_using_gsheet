import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiArrowRight,
  FiStopCircle,
  FiPlay,
  FiPlus,
} from 'react-icons/fi';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Card from '@/features/reason-eliminator/components/common/Card.jsx';
import Autocomplete from '@/features/reason-eliminator/components/common/Autocomplete.jsx';
import Input from '@/features/reason-eliminator/components/common/Input.jsx';
import InlineError from '@/features/reason-eliminator/components/common/InlineError.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import FlowFooter from '../components/FlowFooter.jsx';
import ReasonsTable from '../components/ReasonsTable.jsx';
import { POWER_WORDS, SESSION_STATUS } from '../constants.js';
import { reasonNumber } from '../utils/formatters.js';
import { normalizeText, validatePowerWord } from '../utils/validators.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';

export default function PowerWordPage() {
  const navigate = useNavigate();
  const {
    reasons: rawReasons,
    hasActiveSession,
    setPowerWord,
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
  const [draft, setDraft] = useState('');
  // When true, the user chose "Others" and types a custom power word.
  const [customMode, setCustomMode] = useState(false);
  const [resumed, setResumed] = useState(false);
  // Set when the user tries to continue (Next/End) without a valid power word,
  // so a "required" message shows even while the field is still empty/untouched.
  const [attempted, setAttempted] = useState(false);
  // End-validation popup when some reasons still have no power word.
  // Holds { index, message }. null = popup closed.
  const [endWarn, setEndWarn] = useState(null);
  // Popup shown when the user clicks Next on the last reason — offers to go
  // back and add another reason, or End to start the Grip Test.
  const [showNextPrompt, setShowNextPrompt] = useState(false);

  // On mount, resume from the first reason that still has no power word.
  // Lets the user go back, edit/add reasons, and return without restarting —
  // completed power words are kept and we jump to the next pending reason
  // (newly added reasons sit at the end).
  useEffect(() => {
    const firstEmpty = reasons.findIndex((r) => !(r.powerWord || '').trim());
    if (firstEmpty > 0) {
      setCursor(firstEmpty);
      setResumed(true);
    } else if (firstEmpty === -1 && reasons.length > 0) {
      // Every reason already has a power word — returning here should stay on
      // the last completed reason, not reset back to R1.
      setCursor(reasons.length - 1);
      setResumed(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDraft(reasons[cursor]?.powerWord || '');
    setCustomMode(false);
    setAttempted(false);
  }, [cursor, reasons]);

  const total = reasons.length;
  const current = reasons[cursor];
  const completedCount = useMemo(
    () => reasons.filter((r) => (r.powerWord || '').trim() !== '').length,
    [reasons]
  );
  const progress = useMemo(
    () => (total ? Math.round((completedCount / total) * 100) : 0),
    [completedCount, total]
  );

  // Safety net: if the reason list shrinks (e.g. a reason was deleted), keep
  // the cursor in range so a valid reason always renders — never a blank card.
  useEffect(() => {
    if (total > 0 && cursor > total - 1) setCursor(total - 1);
  }, [total, cursor]);

  if (!hasActiveSession || total === 0) {
    return <Navigate to="/reason-eliminator" replace />;
  }

  const isLast = cursor >= total - 1;

  const { valid, message } = useMemo(
    () => validatePowerWord(draft, POWER_WORDS),
    [draft]
  );
  // Show the error for invalid typed text, and also when the user attempted to
  // continue without selecting/entering a power word at all.
  const showError = !valid && (draft.trim().length > 0 || attempted);
  const errorMessage =
    draft.trim().length === 0
      ? 'Please select or enter a Power Word first.'
      : message;

  const commitCurrent = () => {
    if (!current || !valid) return false;
    setPowerWord(current.id, normalizeText(draft));
    return true;
  };

  const handleNext = () => {
    if (!commitCurrent()) {
      // Block and surface the required-power-word validation message.
      setAttempted(true);
      return;
    }
    setAttempted(false);
    if (isLast) {
      setStatus(SESSION_STATUS.COMPLETED);
      persist({ status: SESSION_STATUS.COMPLETED });
      // Last power word done — offer to add another reason or End to the Grip
      // Test.
      setShowNextPrompt(true);
      return;
    }
    // Save progress after every power word so nothing is lost on reload.
    persist();
    setCursor((c) => c + 1);
  };

  const handleEnd = () => {
    // If the user typed something invalid for the current reason, surface that.
    if (draft.trim() && !valid) {
      setAttempted(true);
      return;
    }
    // Save the current reason's power word if it's valid.
    if (valid) commitCurrent();
    // Every reason must have a power word before the exercise can finish. Treat
    // the current reason via its draft (just committed) since context state
    // updates asynchronously.
    const idx = reasons.findIndex((r, i) => {
      const pw = i === cursor ? normalizeText(draft) : r.powerWord || '';
      return !pw.trim();
    });
    if (idx !== -1) {
      const r = reasons[idx];
      setEndWarn({
        index: idx,
        message: `Please provide Power Words for all reasons first. Next incomplete reason: ${reasonNumber(
          r,
          idx
        )}.`,
      });
      return;
    }
    persist();
    // Every reason now has a power word — continue to the Full Assessment.
    navigate('/reason-eliminator/summary');
  };

  // End the exercise and continue to the Full Assessment. Everything stays
  // saved; nothing is reset. (The Grip Test is reached from the Home screen.)
  const handleViewFullAssessment = () => {
    persist();
    navigate('/reason-eliminator/summary');
  };

  // "Previous": step back one reason (R2 -> R1), keeping every saved Power Word
  // (the valid current entry is committed first, so nothing is reset). Only when
  // already on the first reason does it leave to the Assessment Ended screen.
  const handlePrevious = () => {
    if (draft.trim() && !valid) return;
    if (draft.trim()) commitCurrent();
    persist();
    if (cursor > 0) {
      setCursor((c) => c - 1);
      return;
    }
    navigate('/reason-eliminator/assess', { state: { ended: true } });
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
            Power Word Exercise
          </h1>
          <p className="mt-2 text-sm text-brand-gray-900">
            Replace each Reason with a single Power Word that drives action.
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
              Resuming where you left off — your completed Power Words are
              saved.
            </span>
          </motion.div>
        )}

        <div className="mb-5">
          <div className="flex items-center justify-between text-sm text-brand-gray-900 mb-2">
            <span>
              Power word {cursor + 1} of {total}
            </span>
            <span>
              {completedCount} of {total} completed · {progress}%
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

        <ReasonsTable reasons={reasons} showIndex showCategory showSubcategory />

        <Card className="mt-6 p-6 md:p-8">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-3 mb-4"
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-red text-white font-bold shadow-sm shadow-brand-red/20">
                  {reasonNumber(current, cursor)}
                </span>
                <div>
                  <p className="text-sm uppercase tracking-widest text-brand-red font-semibold">
                    Power word for
                  </p>
                  <p className="text-base md:text-lg font-semibold text-brand-black">
                    {current.text}
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {customMode ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-brand-gray-900">
                  Add your own Power Word
                </label>
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-red hover:underline"
                >
                  <FiArrowLeft size={12} /> Choose from list
                </button>
              </div>
              <Input
                autoFocus
                value={draft}
                error={showError ? errorMessage : undefined}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder="Type a custom Power Word"
              />
            </div>
          ) : (
            <>
              <Autocomplete
                autoFocus
                value={draft}
                onChange={setDraft}
                onSelect={setDraft}
                options={POWER_WORDS}
                onSubmit={handleNext}
                onOthers={() => setCustomMode(true)}
                othersLabel="Others"
                showAllOnFocus
                error={showError}
                placeholder="Select or type a Power Word"
              />
              <InlineError message={showError ? errorMessage : null} />
              <p className="mt-2 text-sm text-brand-gray-900">
                Start typing for suggestions — press{' '}
                <kbd className="rounded border border-brand-gray-200 bg-brand-gray-50 px-1 font-sans">
                  Tab
                </kbd>{' '}
                or{' '}
                <kbd className="rounded border border-brand-gray-200 bg-brand-gray-50 px-1 font-sans">
                  Enter
                </kbd>{' '}
                to pick one, or choose{' '}
                <span className="font-medium text-brand-gray-900">Others</span>{' '}
                to add your own.
              </p>
            </>
          )}

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
                  onClick={handleEnd}
                >
                  End
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
        open={showNextPrompt}
        onClose={() => setShowNextPrompt(false)}
        title="All reasons now have a Power Word."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              leftIcon={<FiPlus />}
              onClick={() => {
                // Add another reason from the start-new-reason screen.
                setShowNextPrompt(false);
                navigate('/reason-eliminator/new');
              }}
            >
              Add New Reason
            </Button>
            <Button
              leftIcon={<FiStopCircle />}
              onClick={() => {
                // End the exercise and continue to the Full Assessment.
                setShowNextPrompt(false);
                handleViewFullAssessment();
              }}
            >
              End
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray-900">
          Go back to add another Reason, or End to view your Full Assessment.
        </p>
      </Modal>

      <Modal
        open={!!endWarn}
        onClose={() => setEndWarn(null)}
        title="Power Words Incomplete"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEndWarn(null)}>
              Cancel
            </Button>
            <Button
              rightIcon={<FiArrowRight />}
              onClick={() => {
                // Jump to the first incomplete reason. Saved power words stay in
                // state, so no progress is reset.
                persist();
                const idx = endWarn?.index ?? 0;
                setEndWarn(null);
                setCursor(idx);
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        <p className="text-sm text-brand-gray-900">{endWarn?.message}</p>
      </Modal>
    </PageTransition>
  );
}
