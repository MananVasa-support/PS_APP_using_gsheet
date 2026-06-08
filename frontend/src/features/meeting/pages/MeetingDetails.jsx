import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeeting } from '../context/MeetingContext';
import { allQuestions, TOTAL_QUESTIONS, getAnswerText } from '../data/questions';
import {
  statusStyles, formatDate, formatEstTime, MEETING_STATUSES,
} from '../utils/meetingFormat';
import {
  FiArrowLeft, FiClock, FiCalendar, FiEdit2, FiTrash2, FiPlus,
  FiCheck, FiX, FiAlertTriangle, FiFileText, FiStar,
  FiCheckCircle, FiTarget,
} from 'react-icons/fi';
import RatingScale from '../components/RatingScale';
import clsx from 'clsx';

export default function MeetingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getMeeting, updateMeetingStatus, completeMeetingWithReflection,
    addNote, updateNote, deleteNote,
  } = useMeeting();

  const meeting = getMeeting(id);

  // Notes local UI state
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Actual Meeting Reflection form state (shown when marking Completed).
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [reflectionRating, setReflectionRating] = useState(null);
  const [reflectionLearnings, setReflectionLearnings] = useState('');
  const [reflectionError, setReflectionError] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);

  // Auto-hide the success confirmation.
  useEffect(() => {
    if (!reflectionSaved) return;
    const t = setTimeout(() => setReflectionSaved(false), 4000);
    return () => clearTimeout(t);
  }, [reflectionSaved]);

  // Guard: meeting not found (e.g. deleted or bad URL)
  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border border-line bg-surface rounded-2xl max-w-3xl mx-auto shadow-card">
        <FiAlertTriangle className="text-5xl text-brand-red mb-4" />
        <h3 className="text-xl font-bold text-mkink mb-2">Meeting Not Found</h3>
        <p className="text-muted text-xs max-w-sm mb-6">
          This meeting may have been removed or the link is invalid.
        </p>
        <button
          onClick={() => navigate('/meeting-framework/meeting-list')}
          className="px-6 py-2.5 bg-brand-red text-white text-xs font-bold uppercase rounded-lg hover:bg-brand-red-dark transition-colors"
        >
          Back to Meeting List
        </button>
      </div>
    );
  }

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addNote(meeting.id, newNote.trim());
    setNewNote('');
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const saveEdit = (noteId) => {
    if (!editingText.trim()) return;
    updateNote(meeting.id, noteId, editingText.trim());
    cancelEdit();
  };

  // ----- Status / Reflection -----
  // Clicking "Completed" opens the reflection form instead of completing now.
  // Other statuses apply immediately.
  const handleStatusClick = (status) => {
    if (status === 'Completed') {
      setReflectionRating(meeting.reflection?.planningHelpfulness ?? null);
      setReflectionLearnings(meeting.reflection?.learnings ?? '');
      setReflectionError(false);
      setShowReflectionForm(true);
      return;
    }
    setShowReflectionForm(false);
    updateMeetingStatus(meeting.id, status);
  };

  const handleSaveReflection = () => {
    const learnings = reflectionLearnings.trim();
    if (reflectionRating === null || !learnings) {
      setReflectionError(true);
      return;
    }
    completeMeetingWithReflection(meeting.id, {
      planningHelpfulness: reflectionRating,
      learnings,
    });
    setShowReflectionForm(false);
    setReflectionError(false);
    setReflectionSaved(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Back link */}
      <button
        onClick={() => navigate('/meeting-framework/meeting-list')}
        className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-brand-red transition-colors"
      >
        <FiArrowLeft /> Back to Meeting List
      </button>

      {/* Header card */}
      <div className="bg-surface border border-line p-6 sm:p-8 rounded-2xl shadow-card space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-mkink leading-snug break-words">
              {meeting.title}
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-2">
                <FiClock className="text-brand-red" />
                Estimated time:&nbsp;
                <span className="text-mkink font-semibold">
                  {formatEstTime(meeting.estTime)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <FiCalendar className="text-brand-red" />
                Created:&nbsp;
                <span className="text-mkink font-semibold">{formatDate(meeting.createdDate)}</span>
              </span>
            </div>
          </div>

          <span
            className={clsx(
              'shrink-0 text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider select-none h-fit',
              statusStyles[meeting.status] || statusStyles.Upcoming
            )}
          >
            {meeting.status}
          </span>
        </div>

        {/* Status switcher */}
        <div className="pt-4 border-t border-line">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted mb-3">
            Update Status
          </p>
          <div className="flex flex-wrap gap-2">
            {MEETING_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusClick(s)}
                className={clsx(
                  'px-4 py-2 rounded-lg border text-xs font-bold transition-all duration-200 select-none',
                  meeting.status === s
                    ? 'bg-brand-red-tint border-brand-red text-brand-red'
                    : 'bg-surface border-line text-muted hover:text-mkink hover:border-muted-soft'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Reflection form — shown when marking a meeting Completed */}
          {showReflectionForm && (
            <div className="mt-5 pt-5 border-t border-line space-y-5">
              <div>
                <h4 className="text-base font-bold text-mkink flex items-center gap-2">
                  <FiTarget className="text-brand-red" /> Actual Meeting Reflection
                </h4>
                <p className="text-xs text-muted mt-0.5">
                  Capture how the meeting actually went before marking it Completed.
                </p>
              </div>

              {reflectionError && (
                <div className="flex items-center gap-3 bg-brand-red-tint border border-brand-red/30 p-3 rounded-xl text-brand-red">
                  <FiAlertTriangle className="text-lg shrink-0" />
                  <p className="text-xs font-semibold">
                    Please provide a rating and your learnings before completing.
                  </p>
                </div>
              )}

              {/* Q1 — required rating */}
              <RatingScale
                number={1}
                label="Planning Experience Rating"
                helper="Rate how helpful the meeting planning process was in supporting your actual meeting."
                value={reflectionRating}
                onChange={(v) => {
                  setReflectionRating(v);
                  setReflectionError(false);
                }}
              />

              {/* Q2 — required learnings */}
              <div className="space-y-2">
                <label htmlFor="reflection-learnings" className="block text-sm font-semibold text-mkink leading-snug">
                  <span className="text-brand-red font-bold">2. </span>
                  Your Learnings: Planned Meeting vs Actual Meeting
                </label>
                <p className="text-xs text-muted leading-snug">
                  Describe the key differences between your planned meeting and the actual meeting. Share your learnings, observations, unexpected outcomes, challenges, and insights.
                </p>
                <textarea
                  id="reflection-learnings"
                  rows={4}
                  placeholder="What happened differently from your plan? What worked well? What would you improve next time?"
                  value={reflectionLearnings}
                  onChange={(e) => {
                    setReflectionLearnings(e.target.value);
                    setReflectionError(false);
                  }}
                  className={clsx(
                    'w-full bg-surface border text-sm rounded-xl px-4 py-3 text-mkink placeholder-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all resize-y min-h-[110px]',
                    reflectionError && !reflectionLearnings.trim() ? 'border-brand-red' : 'border-line'
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    setShowReflectionForm(false);
                    setReflectionError(false);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-surface hover:bg-surface-alt border border-line text-mkink font-bold text-xs rounded-lg transition-all"
                >
                  <FiX /> Cancel
                </button>
                <button
                  onClick={handleSaveReflection}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-red hover:bg-brand-red-dark text-white font-bold text-xs rounded-lg transition-all shadow-red"
                >
                  <FiCheck /> Save &amp; Mark as Completed
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success confirmation (after completing) */}
      {reflectionSaved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-card text-sm font-semibold">
          <FiCheckCircle className="text-lg shrink-0" />
          Meeting marked as Completed and your reflection was saved.
        </div>
      )}

      {/* Experience Ratings (only if captured) */}
      {meeting.experience && (
        <div className="bg-surface border border-line p-6 sm:p-8 rounded-2xl shadow-card space-y-6">
          <div className="border-b border-line pb-3 flex items-center gap-2">
            <FiStar className="text-brand-red" />
            <h3 className="text-lg font-bold text-mkink">Experience Ratings</h3>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Awareness & Clarity', value: meeting.experience.awareness },
              { label: 'Confidence & Self-Esteem', value: meeting.experience.confidence },
              { label: 'Chances of Success', value: meeting.experience.success },
            ].map((row) => {
              const val = typeof row.value === 'number' ? row.value : null;
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-mkink">{row.label}</span>
                    <span className="text-sm font-bold text-brand-red shrink-0">
                      {val === null ? '—' : `${val}/5`}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-line-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-red rounded-full transition-all"
                      style={{ width: `${((val ?? 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-soft mb-1">
              Any Other Realisation
            </p>
            <p className="text-sm text-mkink-soft break-words leading-relaxed whitespace-pre-wrap">
              {meeting.experience.realisation
                ? meeting.experience.realisation
                : <span className="text-muted italic">No additional realisation provided.</span>}
            </p>
          </div>
        </div>
      )}

      {/* Actual Meeting Reflection (read-only, when captured) */}
      {meeting.reflection && !showReflectionForm && (
        <div className="bg-surface border border-line p-6 sm:p-8 rounded-2xl shadow-card space-y-5">
          <div className="border-b border-line pb-3 flex items-center gap-2">
            <FiTarget className="text-brand-red" />
            <h3 className="text-lg font-bold text-mkink">Actual Meeting Reflection</h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-mkink">Planning Experience Rating</span>
              <span className="text-sm font-bold text-brand-red shrink-0">
                {typeof meeting.reflection.planningHelpfulness === 'number'
                  ? `${meeting.reflection.planningHelpfulness}/5`
                  : '—'}
              </span>
            </div>
            <div className="h-2 w-full bg-line-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-red rounded-full transition-all"
                style={{
                  width: `${((meeting.reflection.planningHelpfulness ?? 0) / 5) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-soft mb-1">
              Your Learnings: Planned Meeting vs Actual Meeting
            </p>
            <p className="text-sm text-mkink-soft break-words leading-relaxed whitespace-pre-wrap">
              {meeting.reflection.learnings
                ? meeting.reflection.learnings
                : <span className="text-muted italic">No learnings recorded.</span>}
            </p>
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="bg-surface border border-line p-6 sm:p-8 rounded-2xl shadow-card space-y-6">
        <div className="border-b border-line pb-3 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-mkink">Meeting Notes</h3>
            <p className="text-xs text-muted mt-0.5">
              Record what happened, outcomes, decisions, follow-ups, and observations.
            </p>
          </div>
          <span className="text-xs bg-surface-alt border border-line px-3 py-1.5 rounded-lg text-muted select-none">
            {meeting.notes.length} {meeting.notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>

        {/* Add note form */}
        <form onSubmit={handleAddNote} className="flex flex-col gap-3 p-4 bg-surface-alt border border-line rounded-xl">
          <textarea
            rows={3}
            placeholder="e.g. Client approved proposal. Budget discussion completed. Follow-up scheduled for next week."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full bg-surface border border-line text-sm rounded-xl px-4 py-3 text-mkink placeholder-muted-soft focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all resize-y min-h-[70px]"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="self-end flex items-center gap-2 px-5 py-2.5 bg-brand-red hover:bg-brand-red-dark font-bold text-xs text-white rounded-lg transition-colors shadow-red disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <FiPlus /> Add Note
          </button>
        </form>

        {/* Notes list */}
        <div className="space-y-3">
          {meeting.notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FiFileText className="text-3xl text-muted-soft/60 mb-3" />
              <p className="text-xs text-muted/70 italic select-none">
                No notes yet. Add your first note above.
              </p>
            </div>
          )}

          {meeting.notes.map((note) => (
            <div
              key={note.id}
              className="bg-surface-alt border border-line rounded-xl p-4"
            >
              {editingNoteId === note.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full bg-surface border border-brand-red/40 text-sm rounded-xl px-4 py-3 text-mkink focus:outline-none focus:ring-2 focus:ring-brand-red transition-all resize-y min-h-[70px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-line text-muted hover:text-mkink font-semibold text-xs rounded-lg transition-colors"
                    >
                      <FiX /> Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(note.id)}
                      disabled={!editingText.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-red hover:bg-brand-red-dark font-bold text-xs text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <FiCheck /> Save Note
                    </button>
                  </div>
                </div>
              ) : (
                /* Read mode */
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm text-mkink break-words leading-relaxed whitespace-pre-wrap">
                      {note.text}
                    </p>
                    <p className="text-[10px] text-muted select-none">
                      {formatDate(note.createdDate)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(note)}
                      title="Edit note"
                      className="p-2 text-muted hover:text-brand-red hover:bg-brand-red-tint rounded-lg transition-colors"
                    >
                      <FiEdit2 className="text-sm" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this note? This cannot be undone.')) {
                          deleteNote(meeting.id, note.id);
                        }
                      }}
                      title="Delete note"
                      className="p-2 text-muted hover:text-brand-red hover:bg-brand-red-tint rounded-lg transition-colors"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All 18 Questions & Answers — vertical layout */}
      <div className="bg-surface border border-line rounded-2xl shadow-card overflow-hidden">
        <div className="border-b border-line p-6 sm:px-8 flex justify-between items-center">
          <h3 className="text-lg font-bold text-mkink">Meeting Plan Details</h3>
          <span className="text-xs bg-brand-red-tint text-brand-red px-2.5 py-0.5 rounded-full border border-brand-red/25 select-none font-semibold">
            {TOTAL_QUESTIONS} questions
          </span>
        </div>

        <div className="divide-y divide-line">
          {allQuestions.map((q, idx) => {
            const answer = getAnswerText(q, meeting.answers);
            return (
              <div key={q.id} className="p-5 sm:p-6 flex flex-col gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-red">
                    Question {idx + 1}
                  </p>
                  <h4 className="text-sm font-semibold text-mkink leading-snug">{q.label}</h4>
                </div>
                <div className="pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-soft">
                    Answer:
                  </p>
                  <p className="text-sm text-mkink-soft break-words leading-relaxed whitespace-pre-wrap mt-0.5">
                    {answer ? answer : <span className="text-brand-red italic">No answer provided</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
