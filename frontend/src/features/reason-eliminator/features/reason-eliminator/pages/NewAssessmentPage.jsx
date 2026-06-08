import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiStopCircle,
  FiLayers,
  FiChevronDown,
  FiPlus,
  FiZap,
} from 'react-icons/fi';
import clsx from 'clsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import { normalizeText } from '../utils/validators.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import { previousReasonsMissingPowerWord } from '../utils/reasonVisibility.js';

// Dropdown choices. `count` is how many reason boxes to show on the page.
// "Customize Range" lets the user type their own number.
const PER_PAGE_OPTIONS = [
  { value: 1, label: '1 Reason', count: 1 },
  { value: 3, label: '1-3 Reasons', count: 3 },
  { value: 5, label: '1-5 Reasons', count: 5 },
  { value: 7, label: '1-7 Reasons', count: 7 },
  { value: 'custom', label: 'Customize Range', count: null },
];

const MIN_CUSTOM = 1;
const MAX_CUSTOM = 20;

export default function NewAssessmentPage() {
  const navigate = useNavigate();
  const { reasons, addReason, startSession, hasActiveSession, sessionId } =
    useAssessmentFlow();

  // Reasons from a PREVIOUS assessment that still have no Power Word. A Power
  // Word is mandatory, so a new assessment can't move forward until these are
  // filled in (over in Previous Assessments). Re-derived on each render — it
  // clears the moment the user comes back from filling them in.
  const prevMissing = previousReasonsMissingPowerWord(sessionId);
  const hasPrevMissing = prevMissing.length > 0;
  // Send the user to Previous Assessments, where the mandatory "Power Word
  // required" popup lets them assign the missing Power Words.
  const goToPrevious = () => navigate('/reason-eliminator/previous');

  // Reasons-per-page selection + the custom count when "Customize Range" is on.
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[0]);
  const [customCount, setCustomCount] = useState(3);
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);
  // Refs to each reason input so Enter can reliably move focus to the next box.
  const inputRefs = useRef([]);

  // How many reason input boxes to render this page.
  const boxCount =
    perPage.value === 'custom'
      ? Math.min(Math.max(customCount || MIN_CUSTOM, MIN_CUSTOM), MAX_CUSTOM)
      : perPage.count;

  // One draft string per visible box. Kept in sync when the count changes.
  const [drafts, setDrafts] = useState(() => Array(boxCount).fill(''));
  // Which confirmation popup is open:
  // null | 'incomplete' | 'choose' | 'prev-start' | 'prev-block'.
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!hasActiveSession) startSession();
  }, [hasActiveSession, startSession]);

  // On arrival, if a previous assessment still needs a Power Word, remind the
  // user once. This reminder is dismissible — they can ignore it and keep
  // typing — but End/Next will then block until those Power Words are filled in.
  useEffect(() => {
    if (previousReasonsMissingPowerWord(sessionId).length > 0) {
      setModal('prev-start');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize the drafts array when the box count changes, preserving any text the
  // user already typed in the boxes that remain.
  useEffect(() => {
    setDrafts((prev) => {
      if (prev.length === boxCount) return prev;
      const next = Array(boxCount).fill('');
      for (let i = 0; i < Math.min(prev.length, boxCount); i += 1) {
        next[i] = prev[i];
      }
      return next;
    });
  }, [boxCount]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Next needs the whole selected range filled; End only needs at least one.
  const allFilled = useMemo(
    () => drafts.length > 0 && drafts.every((d) => d.trim() !== ''),
    [drafts]
  );
  const anyFilled = useMemo(
    () => drafts.some((d) => d.trim() !== ''),
    [drafts]
  );

  const setDraftAt = (i, value) => {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? value : d)));
  };

  // Save every filled box using the existing addReason flow (one dispatch per
  // reason — same logic/data the single-box page used).
  const commitAll = () => {
    drafts
      .map(normalizeText)
      .filter(Boolean)
      .forEach((text) => addReason(text));
  };

  // Next: block until the whole selected range is filled, then ask whether to
  // end here or keep adding more reasons.
  const handleNext = () => {
    // A previous assessment's Power Word is still missing — block here and send
    // the user to fill it. The flow can't move forward until it's filled in.
    if (hasPrevMissing) {
      setModal('prev-block');
      return;
    }
    if (!allFilled) {
      setModal('incomplete');
      return;
    }
    setModal('choose');
  };

  // "Add more reasons" from the choice popup: save this batch and start a fresh
  // set of boxes for the next reasons.
  const handleAddMore = () => {
    commitAll();
    setDrafts(Array(boxCount).fill(''));
    setModal(null);
  };

  // Save the current batch and go to View Reasons.
  const finishToReasons = () => {
    commitAll();
    navigate('/reason-eliminator/reasons');
  };

  // End: works even with a partly-filled range — it saves whatever reasons are
  // filled (at least one) and moves on. Only blocks when nothing is filled.
  const handleEnd = () => {
    // Same gate as Next: a previous assessment still needs a Power Word, so the
    // flow can't end/continue until it's filled in.
    if (hasPrevMissing) {
      setModal('prev-block');
      return;
    }
    if (!anyFilled) {
      setModal('incomplete');
      return;
    }
    finishToReasons();
  };

  const handleKeyDown = (e, i) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const nextEl = inputRefs.current[i + 1];
    if (nextEl) {
      // Move forward to the next reason box (Reason 1 -> Reason 2 -> ...).
      nextEl.focus();
    } else if (boxCount === 1) {
      // Single-box mode keeps the original convenience: Enter saves.
      handleNext();
    }
    // On the last box of a multi-box page, Enter does nothing — the cursor
    // never jumps back to the first reason.
  };

  const selectOption = (opt) => {
    setPerPage(opt);
    setOpen(false);
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        {/* Heading — replaces the image's "Plan a Meeting" block. */}
        <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
          Reasons That Stop Me
        </h1>
        <p className="mt-2 text-sm text-brand-gray-900">
          Type a Reason. Click Next to save it and add another.
        </p>

        {/* Card 1 — Reasons Per Page selector. Plain div (not the shared Card)
            so typing never remounts the inputs and steals focus. */}
        <div className="surface-card mt-8 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl text-brand-red shrink-0">
                <FiLayers />
              </span>
              <span className="text-base font-bold text-brand-black">
                Reasons Per Page
              </span>
            </div>

            {/* Custom dropdown styled after the image. */}
            <div ref={ddRef} className="relative w-48 shrink-0">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={clsx(
                  'w-full h-11 px-4 flex items-center justify-between gap-2 rounded-xl bg-white text-sm font-semibold text-brand-black border transition-colors',
                  open
                    ? 'border-brand-red ring-2 ring-brand-red/15'
                    : 'border-brand-gray-200 hover:border-brand-gray-300'
                )}
              >
                <span className="truncate">{perPage.label}</span>
                <FiChevronDown
                  className={clsx(
                    'shrink-0 transition-transform',
                    open && 'rotate-180'
                  )}
                />
              </button>

              {open ? (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl bg-white border border-brand-gray-200 shadow-modal py-1"
                >
                  {PER_PAGE_OPTIONS.map((opt) => {
                    const active = opt.value === perPage.value;
                    return (
                      <li key={String(opt.value)} role="option" aria-selected={active}>
                        <button
                          type="button"
                          onClick={() => selectOption(opt)}
                          className={clsx(
                            'w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors',
                            active
                              ? 'bg-brand-red text-white'
                              : 'text-brand-black hover:bg-brand-gray-100'
                          )}
                        >
                          {opt.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Custom range input — only when "Customize Range" is selected. */}
          {perPage.value === 'custom' ? (
            <div className="mt-4 flex items-center gap-3 pl-9">
              <span className="text-sm text-brand-gray-900">
                Number of reasons
              </span>
              <input
                type="number"
                min={MIN_CUSTOM}
                max={MAX_CUSTOM}
                value={customCount}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setCustomCount(Number.isNaN(n) ? '' : n);
                }}
                onBlur={() => {
                  const n = Math.min(
                    Math.max(Number(customCount) || MIN_CUSTOM, MIN_CUSTOM),
                    MAX_CUSTOM
                  );
                  setCustomCount(n);
                }}
                className="w-24 h-10 px-3 rounded-xl bg-white text-brand-ink border border-brand-gray-200 hover:border-brand-gray-300 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
              />
              <span className="text-xs text-brand-gray-400">
                (max {MAX_CUSTOM})
              </span>
            </div>
          ) : null}
        </div>

        {/* Card 2 — the reason input boxes. Plain div (not the shared Card). */}
        <div className="surface-card mt-5 p-6 md:p-8">
          <div className="flex flex-col gap-6">
            {drafts.map((value, i) => (
              <div key={i}>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-red mb-2">
                  Reason {i + 1}
                </p>
                <input
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  autoFocus={i === 0}
                  value={value}
                  onChange={(e) => setDraftAt(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  placeholder="e.g. I wasted time on social media instead of starting"
                  className="w-full h-12 px-4 rounded-xl bg-white text-brand-ink placeholder-brand-gray-400 border border-brand-gray-200 hover:border-brand-gray-300 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition-all duration-200"
                />
              </div>
            ))}
          </div>

          {/* Footer actions — End + Next, styled like the image. */}
          <div className="mt-7 flex items-center justify-between gap-3">
            <p className="text-sm text-brand-black">
              {reasons.length} saved so far
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleEnd}
                leftIcon={<FiStopCircle />}
              >
                End
              </Button>
              <Button onClick={handleNext} rightIcon={<FiArrowRight />}>
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Range not fully filled — block and ask the user to complete it. */}
        <Modal
          open={modal === 'incomplete'}
          onClose={() => setModal(null)}
          title="Complete your reasons"
          description="Please fill your selected reason range to continue."
          size="sm"
          footer={<Button onClick={() => setModal(null)}>Continue</Button>}
        />

        {/* Range complete — end here or keep adding more reasons. */}
        <Modal
          open={modal === 'choose'}
          onClose={() => setModal(null)}
          title="Add more reasons?"
          description="You've filled your selected range. Do you want to end here, or add more reasons?"
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={handleAddMore}
                leftIcon={<FiPlus />}
              >
                Add More Reasons
              </Button>
              <Button onClick={finishToReasons} leftIcon={<FiStopCircle />}>
                End
              </Button>
            </>
          }
        />

        {/* On-arrival reminder — a previous assessment still needs a Power Word.
            Dismissible: the user may ignore it and keep typing, but End/Next
            will block until those Power Words are filled in. */}
        <Modal
          open={modal === 'prev-start'}
          onClose={() => setModal(null)}
          title="Power Word needed for your previous assessment"
          description={`A previous assessment still has ${prevMissing.length} reason${
            prevMissing.length === 1 ? '' : 's'
          } without a Power Word. Please go to Previous Assessments and give them a Power Word.`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Later
              </Button>
              <Button onClick={goToPrevious} leftIcon={<FiZap />}>
                Go to Previous Assessment
              </Button>
            </>
          }
        />

        {/* Blocking popup on End/Next — the flow cannot move forward while a
            previous assessment's Power Word is missing. The user either goes to
            fill it, or ends (closes) here; nothing advances until it's filled. */}
        <Modal
          open={modal === 'prev-block'}
          onClose={() => setModal(null)}
          title="Please give a Power Word to your previous assessment"
          description={`You can't continue until every previous reason has a Power Word. ${
            prevMissing.length
          } reason${
            prevMissing.length === 1 ? '' : 's'
          } still need one — add ${
            prevMissing.length === 1 ? 'it' : 'them'
          } in Previous Assessments.`}
          size="sm"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setModal(null)}
                leftIcon={<FiStopCircle />}
              >
                End
              </Button>
              <Button onClick={goToPrevious} leftIcon={<FiZap />}>
                Go to Previous Assessment
              </Button>
            </>
          }
        />
      </div>
    </PageTransition>
  );
}
