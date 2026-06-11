import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMeeting } from '../context/MeetingContext';
import { allQuestions, TOTAL_QUESTIONS, getAnswerText } from '../data/questions';
import { makeId } from '../utils/id';
import RatingScale from '../components/RatingScale';
import {
  FiArrowRight, FiArrowLeft, FiAlertCircle, FiCheckSquare, FiEdit2, FiLayers,
  FiSave, FiTrash2, FiPlus, FiStar
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// Question Group selector options. `value` = number of questions per step.
const GROUP_OPTIONS = [
  { value: 1, label: '1 Question' },
  { value: 3, label: '1–3 Questions' },
  { value: 5, label: '1–5 Questions' },
  { value: 7, label: '1–7 Questions' },
];

// Experience-rating questions shown after Complete Meeting (0–5 scale).
const RATING_QUESTIONS = [
  { key: 'awareness', label: 'Increase in Awareness & Clarity for this Meeting' },
  { key: 'confidence', label: 'Increase in your Confidence & Self-Esteem for the Meeting' },
  { key: 'success', label: 'Increase in Chances of Success in this Meeting' },
];

const emptyExperience = { awareness: null, confidence: null, success: null, realisation: '' };

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

export default function Prep() {
  const {
    formData, updateFormField, resetPlanning, addMeeting,
    getMeeting, startEditMeeting, updateMeeting,
  } = useMeeting();
  const navigate = useNavigate();

  // When an `:id` route param is present we are EDITING that meeting (duplicates only).
  const { id: editId } = useParams();
  const editing = Boolean(editId);

  // How many questions to show per step (default: "1 Question").
  const [perStep, setPerStep] = useState(1);
  // Current 0-indexed step within the form.
  const [currentStep, setCurrentStep] = useState(0);
  // 'form' = answering questions; 'review' = vertical review; 'rating' = experience rating.
  const [mode, setMode] = useState('form');

  const [errors, setErrors] = useState({});
  const [showErrorBanner, setShowErrorBanner] = useState(false);

  // Experience ratings (collected after Complete Meeting, create flow only).
  const [experience, setExperience] = useState(emptyExperience);
  const [ratingError, setRatingError] = useState(false);

  // Working copy of the meeting's notes (edit mode only).
  const [notesDraft, setNotesDraft] = useState([]);
  const [newNote, setNewNote] = useState('');

  // Pre-fill the form whenever we enter edit mode (or the edited id changes).
  useEffect(() => {
    if (!editing) return;
    const meeting = getMeeting(editId);
    if (!meeting) {
      // Bad/stale id → bounce back to the list.
      navigate('/meeting-framework/meeting-list', { replace: true });
      return;
    }
    startEditMeeting(meeting);
    setNotesDraft(meeting.notes ? meeting.notes.map((n) => ({ ...n })) : []);
    setCurrentStep(0);
    setMode('form');
    setErrors({});
    setShowErrorBanner(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const totalSteps = useMemo(() => Math.ceil(TOTAL_QUESTIONS / perStep), [perStep]);
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // The slice of questions visible on the current step.
  const startIndex = currentStep * perStep;
  const currentQuestions = allQuestions.slice(startIndex, startIndex + perStep);

  // Duration regex: accepts H/MM or HH/MM (e.g. 3/30, 03/30, 00/45)
  const DURATION_RE = /^\d{1,2}\/\d{2}$/;

  // ----- Validation -----
  // Validate a given list of questions; returns an errors object.
  const validateQuestions = (questions) => {
    const newErrors = {};
    questions.forEach((q) => {
      if (q.type === 'radio') {
        if (!formData[q.id]) {
          newErrors[q.id] = 'Please select an option.';
        } else if (formData[q.id] === 'Other' && !String(formData[`${q.id}_other`] || '').trim()) {
          newErrors[`${q.id}_other`] = 'Please specify your option.';
        }
      } else if (q.type === 'duration') {
        const val = String(formData[q.id] || '').trim();
        if (!val) {
          newErrors[q.id] = 'Answer is required. Type "NA" if not applicable.';
        } else if (val.toLowerCase() !== 'na' && !DURATION_RE.test(val)) {
          newErrors[q.id] = 'Please enter time in HH/MM format. Example: 03/30';
        } else if (DURATION_RE.test(val)) {
          const mins = parseInt(val.split('/')[1], 10);
          if (mins > 59) {
            newErrors[q.id] = 'Minutes must be between 00 and 59.';
          }
        }
      } else {
        if (!String(formData[q.id] || '').trim()) {
          newErrors[q.id] = 'Answer is required. Type "NA" if not applicable.';
        }
      }
    });
    return newErrors;
  };

  const hasErrors = (errObj) => Object.keys(errObj).length > 0;

  // ----- Navigation -----
  const handleNext = () => {
    const errs = validateQuestions(currentQuestions);
    setErrors(errs);
    if (hasErrors(errs)) {
      setShowErrorBanner(true);
      scrollTop();
      return;
    }
    setShowErrorBanner(false);
    if (isLastStep) {
      setMode('review');
    } else {
      setCurrentStep((s) => s + 1);
    }
    scrollTop();
  };

  const handlePrevious = () => {
    setShowErrorBanner(false);
    setErrors({});
    if (mode === 'rating') {
      setMode('review');
    } else if (mode === 'review') {
      setMode('form');
    } else {
      setCurrentStep((s) => Math.max(0, s - 1));
    }
    scrollTop();
  };

  // Changing the group size restarts the stepping from the beginning so ranges
  // always stay valid. Answers are preserved.
  const handleGroupChange = (e) => {
    setPerStep(Number(e.target.value));
    setCurrentStep(0);
    setMode('form');
    setErrors({});
    setShowErrorBanner(false);
    scrollTop();
  };

  // From the review page, jump back to the step that contains a given question.
  const handleEditQuestion = (questionIndex) => {
    setCurrentStep(Math.floor(questionIndex / perStep));
    setMode('form');
    setErrors({});
    setShowErrorBanner(false);
    scrollTop();
  };

  // Validate all answers; on failure jump to the first offending step. Returns ok.
  const validateAllAnswers = () => {
    const errs = validateQuestions(allQuestions);
    if (hasErrors(errs)) {
      const firstBadIndex = allQuestions.findIndex(
        (q) => errs[q.id] || errs[`${q.id}_other`]
      );
      setErrors(errs);
      setCurrentStep(Math.floor(firstBadIndex / perStep));
      setMode('form');
      setShowErrorBanner(true);
      scrollTop();
      return false;
    }
    return true;
  };

  // Review-page primary action.
  // Edit flow: update in place and leave. Create flow: continue to rating step.
  const handleReviewPrimary = () => {
    if (!validateAllAnswers()) return;
    setShowErrorBanner(false);
    if (editing) {
      updateMeeting(editId, formData, notesDraft);
      resetPlanning();
      navigate('/meeting-framework/meeting-list', { state: { saved: true } });
    } else {
      setMode('rating');
      scrollTop();
    }
  };

  // ----- Experience rating -----
  const setRating = (key, value) => {
    setExperience((prev) => ({ ...prev, [key]: value }));
    setRatingError(false);
  };

  // Final save (create flow): persist answers + ratings, then redirect.
  const handleCompleteAndSave = () => {
    // Guard answers in case anything changed; jumps back to questions if invalid.
    if (!validateAllAnswers()) return;
    // All three ratings are required (0–5). Realisation is optional.
    const allRated = RATING_QUESTIONS.every((q) => experience[q.key] !== null);
    if (!allRated) {
      setRatingError(true);
      scrollTop();
      return;
    }
    addMeeting(formData, {
      awareness: experience.awareness,
      confidence: experience.confidence,
      success: experience.success,
      realisation: experience.realisation.trim(),
    });
    resetPlanning();
    setExperience(emptyExperience);
    navigate('/meeting-framework/meeting-list', { state: { saved: true } });
  };

  // Top-right button: Reset (create mode) or Cancel edit (edit mode).
  const handleReset = () => {
    if (editing) {
      resetPlanning();
      navigate('/meeting-framework/meeting-list');
      return;
    }
    if (confirm('Are you sure you want to reset? All answers will be cleared.')) {
      resetPlanning();
      setPerStep(1);
      setCurrentStep(0);
      setMode('form');
      setErrors({});
      setShowErrorBanner(false);
      setExperience(emptyExperience);
      setRatingError(false);
      scrollTop();
    }
  };

  // ----- Notes draft helpers (edit mode only) -----
  const updateDraftNote = (noteId, text) =>
    setNotesDraft((prev) => prev.map((n) => (n.id === noteId ? { ...n, text } : n)));

  const deleteDraftNote = (noteId) =>
    setNotesDraft((prev) => prev.filter((n) => n.id !== noteId));

  const addDraftNote = () => {
    const text = newNote.trim();
    if (!text) return;
    setNotesDraft((prev) => [
      ...prev,
      { id: makeId('note'), text, createdDate: new Date().toISOString() },
    ]);
    setNewNote('');
  };

  const variants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-28 md:pb-10">
      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-mkink">
            {mode === 'rating'
              ? 'Rate Your Experience'
              : editing
                ? 'Edit Meeting'
                : 'Plan a Meeting'}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {mode === 'rating'
              ? 'Please rate how this meeting planning process helped you.'
              : editing
                ? 'Update this copied meeting. The original meeting is never affected.'
                : 'Plan a Meeting for Unquestionable Outcomes'}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="shrink-0 text-xs font-semibold text-muted hover:text-brand-red border border-line hover:border-brand-red/40 px-4 py-2 rounded-lg bg-surface transition-all"
        >
          {editing ? 'Cancel' : 'Reset'}
        </button>
      </div>

      {/* Questions Per Step selector (hidden on the review page) */}
      {mode === 'form' && (
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label htmlFor="perStep" className="flex items-center gap-2 text-sm font-bold text-mkink">
            <FiLayers className="text-brand-red" /> Questions Per Step
          </label>
          <div className="relative w-full sm:w-48">
            <select
              id="perStep"
              value={perStep}
              onChange={handleGroupChange}
              className="w-full appearance-none bg-surface border border-line text-sm font-semibold text-mkink rounded-xl pl-4 pr-10 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all"
            >
              {GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <FiArrowRight className="rotate-90" />
            </span>
          </div>
        </div>
      )}

      {/* Validation error banner */}
      {showErrorBanner && (
        <div className="flex items-center gap-3 bg-brand-red-tint border border-brand-red/30 p-4 rounded-xl text-brand-red">
          <FiAlertCircle className="text-xl shrink-0" />
          <div>
            <p className="font-bold text-sm">Missing Required Fields</p>
            <p className="text-xs opacity-90">
              Please answer every question before continuing. Type "NA" if not applicable.
            </p>
          </div>
        </div>
      )}

      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          {/* ---------- FORM MODE ---------- */}
          {mode === 'form' && (
            <motion.div
              key={`step-${currentStep}-${perStep}`}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="space-y-5">
                {currentQuestions.map((q, i) => {
                  const questionNumber = startIndex + i + 1;
                  return (
                    <QuestionField
                      key={q.id}
                      question={q}
                      number={questionNumber}
                      value={formData[q.id]}
                      otherValue={formData[`${q.id}_other`]}
                      error={errors[q.id]}
                      otherError={errors[`${q.id}_other`]}
                      onChange={(val) => updateFormField(q.id, val)}
                      onOtherChange={(val) => updateFormField(`${q.id}_other`, val)}
                      onClearOtherError={() =>
                        setErrors((prev) => {
                          const { [`${q.id}_other`]: _omit, ...rest } = prev;
                          return rest;
                        })
                      }
                      durationRegex={DURATION_RE}
                    />
                  );
                })}
              </div>

              {/* Navigation: Previous (bottom-left) / Next|Review (bottom-right) */}
              <div className="sticky bottom-0 md:relative bg-surface md:bg-transparent border-t md:border-0 border-line -mx-4 md:mx-0 px-4 md:px-0 py-4 md:py-0 flex items-center justify-between gap-4 z-30">
                {!isFirstStep ? (
                  <button
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-5 py-3 bg-surface hover:bg-surface-alt border border-line text-mkink font-bold text-sm rounded-xl transition-all"
                  >
                    <FiArrowLeft /> Previous
                  </button>
                ) : (
                  <span aria-hidden="true" />
                )}

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-sm rounded-xl transition-all shadow-red hover:shadow-red-strong"
                >
                  {isLastStep ? (
                    <>
                      <FiCheckSquare /> Review
                    </>
                  ) : (
                    <>
                      Next <FiArrowRight />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- REVIEW MODE (vertical) ---------- */}
          {mode === 'review' && (
            <motion.div
              key="review"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="bg-surface border border-line rounded-2xl shadow-card divide-y divide-line">
                {allQuestions.map((q, idx) => {
                  const answer = getAnswerText(q, formData);
                  return (
                    <div key={q.id} className="p-5 sm:p-6 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-brand-red">
                            Question {idx + 1}
                          </p>
                          <h4 className="text-sm font-semibold text-mkink leading-snug">
                            {q.label}
                          </h4>
                        </div>
                        <button
                          onClick={() => handleEditQuestion(idx)}
                          title="Edit answer"
                          className="shrink-0 p-2 text-muted hover:text-brand-red hover:bg-brand-red-tint rounded-lg transition-colors"
                        >
                          <FiEdit2 className="text-sm" />
                        </button>
                      </div>
                      <div className="pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-soft">
                          Answer:
                        </p>
                        <p className="text-sm text-mkink-soft break-words leading-relaxed whitespace-pre-wrap mt-0.5">
                          {answer ? answer : (
                            <span className="text-brand-red italic">No answer provided</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Meeting Notes editor (edit mode only) */}
              {editing && (
                <div className="bg-surface border border-line rounded-2xl shadow-card p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                    <h4 className="text-sm font-bold text-mkink">Meeting Notes</h4>
                    <span className="text-xs text-muted">
                      {notesDraft.length} {notesDraft.length === 1 ? 'note' : 'notes'}
                    </span>
                  </div>

                  {notesDraft.length === 0 && (
                    <p className="text-xs text-muted italic">No notes yet. Add one below.</p>
                  )}

                  {notesDraft.map((note) => (
                    <div key={note.id} className="flex gap-2 items-start">
                      <textarea
                        rows={2}
                        value={note.text}
                        onChange={(e) => updateDraftNote(note.id, e.target.value)}
                        className="flex-1 bg-surface border border-line text-sm rounded-xl px-3 py-2 text-mkink placeholder-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all resize-y min-h-[52px]"
                      />
                      <button
                        onClick={() => deleteDraftNote(note.id)}
                        title="Delete note"
                        className="shrink-0 p-2 text-muted hover:text-brand-red hover:bg-brand-red-tint rounded-lg transition-colors"
                      >
                        <FiTrash2 className="text-sm" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2 items-start pt-1">
                    <textarea
                      rows={2}
                      value={newNote}
                      placeholder="Add a new note…"
                      onChange={(e) => setNewNote(e.target.value)}
                      className="flex-1 bg-surface-alt border border-line text-sm rounded-xl px-3 py-2 text-mkink placeholder-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all resize-y min-h-[52px]"
                    />
                    <button
                      onClick={addDraftNote}
                      disabled={!newNote.trim()}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs rounded-lg transition-colors shadow-red disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation: Previous (bottom-left) / Submit (bottom-right) */}
              <div className="sticky bottom-0 md:relative bg-surface md:bg-transparent border-t md:border-0 border-line -mx-4 md:mx-0 px-4 md:px-0 py-4 md:py-0 flex items-center justify-between gap-4 z-30">
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-5 py-3 bg-surface hover:bg-surface-alt border border-line text-mkink font-bold text-sm rounded-xl transition-all"
                >
                  <FiArrowLeft /> Previous
                </button>

                <button
                  onClick={handleReviewPrimary}
                  className="flex items-center gap-2 px-7 py-3 bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-sm rounded-xl transition-all shadow-red hover:shadow-red-strong"
                >
                  {editing ? (
                    <>
                      <FiSave /> Update Meeting
                    </>
                  ) : (
                    <>
                      <FiCheckSquare /> Complete Meeting
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ---------- RATING MODE (Rate Your Experience) ---------- */}
          {mode === 'rating' && (
            <motion.div
              key="rating"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {ratingError && (
                <div className="flex items-center gap-3 bg-brand-red-tint border border-brand-red/30 p-4 rounded-xl text-brand-red">
                  <FiAlertCircle className="text-xl shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Please rate all three questions</p>
                    <p className="text-xs opacity-90">
                      Choose a value from 0 (lowest) to 5 (highest) for each.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-surface border border-line rounded-2xl shadow-card p-5 sm:p-7 space-y-7">
                {RATING_QUESTIONS.map((q, idx) => (
                  <RatingScale
                    key={q.key}
                    number={idx + 1}
                    label={q.label}
                    value={experience[q.key]}
                    onChange={(v) => setRating(q.key, v)}
                  />
                ))}

                {/* Optional realisation */}
                <div className="space-y-2 pt-1 border-t border-line">
                  <label htmlFor="realisation" className="block text-sm font-bold text-mkink pt-4">
                    Any Other Realisation
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-muted-soft">
                      Optional
                    </span>
                  </label>
                  <textarea
                    id="realisation"
                    rows={3}
                    placeholder="Share any insights, learnings, observations, or realisations from this planning process..."
                    value={experience.realisation}
                    onChange={(e) =>
                      setExperience((prev) => ({ ...prev, realisation: e.target.value }))
                    }
                    className="w-full bg-surface border border-line text-sm rounded-xl px-4 py-3 text-mkink placeholder-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all resize-y min-h-[88px]"
                  />
                </div>
              </div>

              {/* Navigation: Previous (back to review) / Complete & Save */}
              <div className="sticky bottom-0 md:relative bg-surface md:bg-transparent border-t md:border-0 border-line -mx-4 md:mx-0 px-4 md:px-0 py-4 md:py-0 flex items-center justify-between gap-4 z-30">
                <button
                  onClick={handlePrevious}
                  className="flex items-center gap-2 px-5 py-3 bg-surface hover:bg-surface-alt border border-line text-mkink font-bold text-sm rounded-xl transition-all"
                >
                  <FiArrowLeft /> Previous
                </button>

                <button
                  onClick={handleCompleteAndSave}
                  className="flex items-center gap-2 px-7 py-3 bg-brand-red hover:bg-brand-red-dark text-white font-extrabold text-sm rounded-xl transition-all shadow-red hover:shadow-red-strong"
                >
                  <FiCheckSquare /> Complete &amp; Save Meeting
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------- Single question field ----------
function QuestionField({
  question,
  number,
  value,
  otherValue,
  error,
  otherError,
  onChange,
  onOtherChange,
  onClearOtherError,
  durationRegex,
}) {
  const inputBase =
    'w-full bg-surface border text-sm rounded-xl px-4 py-3 text-mkink placeholder-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all';
  const borderClass = error ? 'border-brand-red' : 'border-line';

  return (
    <div
      id={`container-${question.id}`}
      className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-card focus-within:border-brand-red/40 transition-colors space-y-3"
    >
      <label htmlFor={`input-${question.id}`} className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
          Question {number}
        </span>
        <span className="block text-sm font-semibold text-mkink leading-snug mt-1">
          {question.label}
        </span>
      </label>

      {question.type === 'text' && (
        <input
          id={`input-${question.id}`}
          aria-label={question.label}
          type="text"
          placeholder="e.g. Weekly Sales Meeting"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(inputBase, borderClass)}
        />
      )}

      {question.type === 'textarea' && (
        <textarea
          id={`input-${question.id}`}
          aria-label={question.label}
          rows={3}
          placeholder="Write your answer. If nothing to write, type NA."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(inputBase, borderClass, 'resize-y min-h-[88px]')}
        />
      )}

      {question.type === 'number' && (
        <input
          id={`input-${question.id}`}
          aria-label={question.label}
          type="number"
          min="1"
          placeholder="e.g. 45"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(inputBase, borderClass)}
        />
      )}

      {question.type === 'duration' && (
        /* Hours / minutes steppers (same pattern as Power Planner) — stored as
           "HH/MM" so validation, calendar duration and exports are unchanged. */
        <DurationBoxes id={`input-${question.id}`} value={value} onChange={onChange} borderClass={borderClass} />
      )}

      {question.type === 'radio' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {['Yes', 'No', 'Other'].map((opt) => (
              <label
                key={opt}
                className={clsx(
                  'flex items-center gap-2 border px-4 py-2.5 rounded-xl cursor-pointer transition-all select-none text-sm font-medium',
                  value === opt
                    ? 'bg-brand-red-tint border-brand-red text-mkink font-bold'
                    : 'bg-surface border-line text-muted hover:text-mkink hover:border-muted-soft'
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => {
                    onChange(e.target.value);
                    if (e.target.value !== 'Other') onClearOtherError();
                  }}
                  className="hidden"
                />
                <span
                  className={clsx(
                    'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                    value === opt ? 'border-brand-red bg-brand-red' : 'border-muted-soft bg-transparent'
                  )}
                >
                  {value === opt && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                {opt}
              </label>
            ))}
          </div>

          {value === 'Other' && (
            <input
              type="text"
              placeholder="Please specify scheduling/readiness details."
              value={otherValue}
              onChange={(e) => onOtherChange(e.target.value)}
              className={clsx(inputBase, otherError ? 'border-brand-red' : 'border-line')}
            />
          )}
        </div>
      )}

      {error && (
        <span className="text-xs text-brand-red font-medium flex items-center gap-1.5 select-none">
          <FiAlertCircle /> {error}
        </span>
      )}
      {otherError && (
        <span className="text-xs text-brand-red font-medium flex items-center gap-1.5 select-none">
          <FiAlertCircle /> {otherError}
        </span>
      )}
    </div>
  );
}

// ---------- Duration input: hours/minutes steppers (Power Planner style) ----
// Reads/writes the existing "HH/MM" string so validation, the calendar
// duration (q17/q3) and the exports stay untouched.
function DurationBoxes({ id, value, onChange, borderClass }) {
  const [h = '', m = ''] = String(value || '').split('/');
  const hours = h === '' ? '' : String(parseInt(h, 10) || 0);
  const minutes = m === '' ? '' : String(parseInt(m, 10) || 0);

  const pad = (n) => String(n).padStart(2, '0');
  const emit = (nextH, nextM) => {
    const hh = parseInt(nextH, 10);
    const mm = parseInt(nextM, 10);
    const hasH = !Number.isNaN(hh);
    const hasM = !Number.isNaN(mm);
    if (!hasH && !hasM) {
      onChange('');
      return;
    }
    const safeH = hasH ? Math.max(0, hh) : 0;
    const safeM = hasM ? Math.min(59, Math.max(0, mm)) : 0;
    onChange(`${pad(safeH)}/${pad(safeM)}`);
  };

  const boxClass = clsx(
    'w-20 rounded-lg border bg-white px-3 py-2.5 text-sm text-mkink text-center focus:border-brand-red focus:outline-none',
    borderClass
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          placeholder="0"
          value={hours}
          onChange={(e) => emit(e.target.value, minutes)}
          onWheel={(e) => e.currentTarget.blur()}
          className={boxClass}
          aria-label="Hours"
        />
        <span className="text-xs font-semibold text-muted">hours</span>
        <input
          type="number"
          min="0"
          max="59"
          step="1"
          inputMode="numeric"
          placeholder="0"
          value={minutes}
          onChange={(e) => emit(hours, e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          className={boxClass}
          aria-label="Minutes"
        />
        <span className="text-xs font-semibold text-muted">minutes</span>
      </div>
      <p className="text-xs text-muted">Use the boxes (or arrows) — e.g. 1 hour 30 minutes.</p>
    </div>
  );
}
