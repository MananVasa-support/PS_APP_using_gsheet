import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMeeting } from '../context/MeetingContext';
import {
  FiPlusCircle, FiFileText, FiList, FiArchive, FiCheckCircle, FiX,
  FiCalendar, FiEdit, FiCopy, FiTrash2, FiRotateCcw,
} from 'react-icons/fi';
import { FaRegFilePdf, FaRegFileExcel } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, statusBadgeStyles } from '../utils/meetingFormat';
import {
  scheduleMeetingOnCalendar,
  durationToMinutes,
  isGoogleConfigured,
} from '../utils/calendar';
import clsx from 'clsx';

export default function MeetingList() {
  const {
    meetings,            // active collection
    archivedMeetings,    // archived collection (fully independent)
    archiveMeeting,
    unarchiveMeeting,
    duplicateMeeting,
    deleteMeeting,
    patchMeeting,
  } = useMeeting();
  const navigate = useNavigate();
  const location = useLocation();

  // ---- Schedule on Google Calendar ----
  const [scheduling, setScheduling] = useState(null); // the meeting being scheduled
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedError, setSchedError] = useState('');
  // Success toast after a calendar add/update (mirrors Power Planner's export feedback).
  const [schedToast, setSchedToast] = useState('');
  useEffect(() => {
    if (!schedToast) return undefined;
    const timer = setTimeout(() => setSchedToast(''), 4000);
    return () => clearTimeout(timer);
  }, [schedToast]);

  const openSchedule = (m) => {
    if (!isGoogleConfigured()) {
      alert('Google Calendar is not configured yet (missing Client ID).');
      return;
    }
    setScheduling(m);
    // Prefill from a previous scheduling, else today at 10:00.
    if (m.scheduledFor) {
      const d = new Date(m.scheduledFor);
      setSchedDate(d.toISOString().slice(0, 10));
      setSchedTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } else {
      setSchedDate(new Date().toISOString().slice(0, 10));
      setSchedTime('10:00');
    }
    setSchedError('');
  };

  const confirmSchedule = async () => {
    if (!scheduling || !schedDate || !schedTime) {
      setSchedError('Pick a date and a start time.');
      return;
    }
    setSchedBusy(true);
    setSchedError('');
    try {
      const { eventId } = await scheduleMeetingOnCalendar(scheduling, schedDate, schedTime);
      const wasUpdate = Boolean(scheduling.gcalEventId);
      // Remember the event + chosen time on the meeting (persists to the DB),
      // so re-scheduling UPDATES the same calendar event.
      patchMeeting(scheduling.id, {
        gcalEventId: eventId,
        scheduledFor: `${schedDate}T${schedTime}:00`,
      });
      setScheduling(null);
      setSchedToast(
        wasUpdate
          ? 'Calendar event updated successfully.'
          : 'Meeting added to Google Calendar successfully.'
      );
    } catch (e) {
      setSchedError(e?.message || 'Could not add the meeting to Google Calendar.');
    } finally {
      setSchedBusy(false);
    }
  };

  // Which list to show. Default view = active "Meeting List".
  const [view, setView] = useState('active'); // 'active' | 'archived'

  // Success toast shown after a meeting is saved (set via navigation state).
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (location.state?.saved) {
      setShowSaved(true);
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setShowSaved(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [location.state, location.pathname, navigate]);

  const activeMeetings = meetings;
  const visibleMeetings = view === 'active' ? activeMeetings : archivedMeetings;

  // Delete confirmation modal (custom — lets us add the Calendar note/link).
  const [deleting, setDeleting] = useState(null); // the meeting pending deletion

  const confirmDelete = () => {
    const m = deleting;
    if (!m) return;
    // Calendar cleanup is MANUAL for now (no surprise Google permission popup
    // during a delete) — the modal links straight to Google Calendar. Once the
    // silent-token backend lands, this can become automatic with no popup.
    deleteMeeting(m.id); // always removed from the database
    setDeleting(null);
  };

  // Heavy export libs are code-split and loaded on demand.
  const handleExportPdf = async (meeting) => {
    const { exportMeetingToPdf } = await import('../utils/exportMeeting');
    exportMeetingToPdf(meeting);
  };
  const handleExportExcel = async (meeting) => {
    const { exportMeetingToExcel } = await import('../utils/exportMeeting');
    exportMeetingToExcel(meeting);
  };

  const tabs = [
    { key: 'active', label: 'Meeting List', icon: FiList, count: activeMeetings.length },
    { key: 'archived', label: 'Archived Meetings', icon: FiArchive, count: archivedMeetings.length },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Success toast (after a meeting is saved) */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-card"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FiCheckCircle className="text-lg shrink-0" />
              Meeting saved successfully.
            </span>
            <button
              onClick={() => setShowSaved(false)}
              aria-label="Dismiss"
              className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <FiX />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast (after a Google Calendar add/update) */}
      <AnimatePresence>
        {schedToast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl shadow-card"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <FiCheckCircle className="text-lg shrink-0" />
              {schedToast}
            </span>
            <button
              onClick={() => setSchedToast('')}
              aria-label="Dismiss"
              className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <FiX />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-mkink">
            {view === 'active' ? 'Meeting List' : 'Archived Meetings'}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {view === 'active'
              ? `${activeMeetings.length} active ${activeMeetings.length === 1 ? 'meeting' : 'meetings'}`
              : `${archivedMeetings.length} archived ${archivedMeetings.length === 1 ? 'meeting' : 'meetings'}`}
          </p>
        </div>
        <button
          onClick={() => navigate('/meeting-framework/')}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-red hover:bg-brand-red-dark font-bold text-xs text-white rounded-xl transition-all duration-200 shadow-red"
        >
          <FiPlusCircle className="text-base" /> Plan New Meeting
        </button>
      </div>

      {/* View tabs: Meeting List | Archived Meetings */}
      <div className="inline-flex bg-surface-alt border border-line rounded-xl p-1 gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = view === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={clsx(
                'relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-200',
                isActive ? 'text-white' : 'text-muted hover:text-mkink'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 bg-brand-red rounded-lg shadow-red"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <Icon className="text-sm" />
                {t.label}
                <span
                  className={clsx(
                    'min-w-[18px] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-white/20 text-white' : 'bg-line text-muted'
                  )}
                >
                  {t.count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Vertical, full-width list of cards */}
      {visibleMeetings.length === 0 ? (
        <motion.div
          key={`${view}-empty`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <EmptyState view={view} onPlan={() => navigate('/meeting-framework/')} />
        </motion.div>
      ) : (
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {visibleMeetings.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                archived={view === 'archived'}
                onView={() => navigate(`/meeting-framework/meeting-list/${m.id}`)}
                onSchedule={() => openSchedule(m)}
                onEdit={() => navigate(`/meeting-framework/edit/${m.id}`)}
                onDuplicate={() => duplicateMeeting(m.id)}
                onDelete={() => setDeleting(m)}
                onArchive={() => archiveMeeting(m.id)}
                onRestore={() => unarchiveMeeting(m.id)}
                onExportExcel={() => handleExportExcel(m)}
                onExportPdf={() => handleExportPdf(m)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Delete confirmation (with Google Calendar note when scheduled) */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setDeleting(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="w-full max-w-sm rounded-2xl bg-surface border border-line p-6 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-mkink flex items-center gap-2">
                <FiTrash2 className="text-brand-red" /> Delete this meeting?
              </h3>
              <p className="mt-2 text-xs text-muted break-words">
                <span className="font-semibold text-mkink">{deleting.title}</span> will be permanently
                deleted from your account. This cannot be undone.
              </p>
              {deleting.gcalEventId && (
                <p className="mt-2 text-xs text-muted">
                  This meeting is on your <span className="font-semibold text-mkink">Google Calendar</span> —
                  you will have to delete that event manually:
                </p>
              )}
              {deleting.gcalEventId && (
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-red hover:underline"
                >
                  <FiCalendar /> Open Google Calendar
                </a>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleting(null)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-bold text-mkink hover:bg-brand-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg bg-brand-red px-4 py-2 text-xs font-bold uppercase text-white hover:bg-brand-red-dark transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule on Google Calendar */}
      <AnimatePresence>
        {scheduling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => !schedBusy && setScheduling(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              className="w-full max-w-sm rounded-2xl bg-surface border border-line p-6 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-mkink flex items-center gap-2">
                <FiCalendar className="text-brand-red" /> Schedule on Google Calendar
              </h3>
              <p className="mt-1 text-xs text-muted break-words">
                {scheduling.title} · duration{' '}
                {durationToMinutes(scheduling.answers?.q17 || scheduling.answers?.q3)} min
                {scheduling.gcalEventId ? ' · updates the existing event' : ''}
              </p>

              <div className="mt-4 space-y-3">
                <label className="block text-xs font-semibold text-mkink">
                  Date
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => setSchedDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-mkink focus:border-brand-red focus:outline-none"
                  />
                </label>
                <label className="block text-xs font-semibold text-mkink">
                  Start time
                  <input
                    type="time"
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-mkink focus:border-brand-red focus:outline-none"
                  />
                </label>
              </div>

              {schedError && <p className="mt-3 text-xs font-medium text-brand-red">{schedError}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={schedBusy}
                  onClick={() => setScheduling(null)}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-bold text-mkink hover:bg-brand-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={schedBusy}
                  onClick={confirmSchedule}
                  className="rounded-lg bg-brand-red px-4 py-2 text-xs font-bold uppercase text-white hover:bg-brand-red-dark transition-colors disabled:opacity-50"
                >
                  {schedBusy ? 'Adding…' : scheduling.gcalEventId ? 'Update event' : 'Add to Calendar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Empty state per view ----------
function EmptyState({ view, onPlan }) {
  if (view === 'archived') {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-line bg-surface rounded-2xl shadow-card">
        <FiArchive className="text-5xl text-brand-red mb-4" />
        <h3 className="text-lg font-bold text-mkink mb-2">No archived meetings</h3>
        <p className="text-muted text-xs max-w-sm">
          Meetings you archive will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-line bg-surface rounded-2xl shadow-card">
      <FiFileText className="text-5xl text-brand-red mb-4" />
      <h3 className="text-lg font-bold text-mkink mb-2">No meetings assigned yet</h3>
      <p className="text-muted text-xs max-w-sm mb-6">
        Complete the Plan a Meeting questionnaire and click "Complete Meeting" to add your first meeting here.
      </p>
      <button
        onClick={onPlan}
        className="flex items-center gap-2 px-6 py-2.5 bg-brand-red text-white text-xs font-bold uppercase rounded-lg hover:bg-brand-red-dark transition-colors"
      >
        <FiPlusCircle /> Start Planning
      </button>
    </div>
  );
}

// ---------- Full-width meeting card with icon action bar ----------
function MeetingCard({
  meeting: m,
  archived = false,
  onView,
  onSchedule,
  onEdit,
  onDuplicate,
  onDelete,
  onArchive,
  onRestore,
  onExportExcel,
  onExportPdf,
}) {
  // stopPropagation so action clicks never trigger the card's "open details".
  const act = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onClick={onView}
      className="bg-surface border border-line hover:border-brand-red/30 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 p-5 flex flex-col gap-4 cursor-pointer"
    >
      {/* Top row: Meeting Name (left) + Status badge (right) */}
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-mkink leading-snug break-words line-clamp-2">
            {m.title}
          </h3>
          <p className="text-xs text-muted mt-1">
            Created: <span className="text-mkink font-semibold">{formatDate(m.createdDate)}</span>
            {m.scheduledFor && (
              <>
                {' · '}Scheduled:{' '}
                <span className="text-mkink font-semibold">
                  {new Date(m.scheduledFor).toLocaleString([], {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-muted-soft">
            Status:
          </span>
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider whitespace-nowrap',
              statusBadgeStyles[m.status] || statusBadgeStyles.Upcoming
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {m.status}
          </span>
        </div>
      </div>

      {/* Action bar (icon + text buttons) */}
      <div className="flex flex-wrap gap-2">
        <ActionButton icon={FiCalendar} label="Schedule" onClick={act(onSchedule)} />
        <ActionButton icon={FiEdit} label="Edit" onClick={act(onEdit)} />
        <ActionButton icon={FiCopy} label="Duplicate" onClick={act(onDuplicate)} />
        <ActionButton icon={FiTrash2} label="Delete" danger onClick={act(onDelete)} />
        {archived ? (
          <ActionButton icon={FiRotateCcw} label="Restore" onClick={act(onRestore)} />
        ) : (
          <ActionButton icon={FiArchive} label="Archive" onClick={act(onArchive)} />
        )}
        <ActionButton icon={FaRegFileExcel} label="Excel Export" onClick={act(onExportExcel)} />
        <ActionButton icon={FaRegFilePdf} label="PDF Export" onClick={act(onExportPdf)} />
      </div>
    </motion.div>
  );
}

// ---------- Icon + text action button ----------
function ActionButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg border bg-surface text-xs font-semibold transition-all duration-200',
        danger
          ? 'border-line text-mkink hover:text-white hover:bg-brand-red hover:border-brand-red hover:shadow-red'
          : 'border-line text-mkink hover:text-brand-red hover:border-brand-red/50 hover:bg-brand-red-tint'
      )}
    >
      <Icon className="text-sm shrink-0" />
      {label}
    </button>
  );
}
