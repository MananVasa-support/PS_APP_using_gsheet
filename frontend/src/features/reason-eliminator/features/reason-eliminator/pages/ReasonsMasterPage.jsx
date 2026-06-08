import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiList, FiArchive, FiTrash2, FiPlay } from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import EmptyState from '@/features/reason-eliminator/components/common/EmptyState.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import ReasonsTable from '../components/ReasonsTable.jsx';
import ReasonEditPanel from '../components/ReasonEditPanel.jsx';
import RecentFilterBar from '../components/RecentFilterBar.jsx';
import reasonEliminatorService from '../services/reasonEliminatorService.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import { formatDate, reasonNumber } from '../utils/formatters.js';
import { filterRecent } from '../utils/recentFilter.js';
import { hasPowerWord } from '../utils/reasonVisibility.js';
import { CATEGORY_BY_ID, CATEGORY_DETAILS, POWER_WORDS } from '../constants.js';

// Flat lookup of every subcategory (reason detail) by id, used to turn a
// reason's saved `details` ids back into their labels for searching.
const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

// All searchable text for one reason — its text, category label(s),
// subcategory label(s), power word and displayed date. Lower-cased so the
// search is case-insensitive. Read-only; mirrors the History page's search.
function reasonHaystack(r) {
  const categoryIds = Array.isArray(r.categories)
    ? r.categories
    : r.category
    ? [r.category]
    : [];
  const categoryLabels = categoryIds
    .map((id) => CATEGORY_BY_ID[id]?.label)
    .filter(Boolean);
  const detailLabels = (Array.isArray(r.details) ? r.details : [])
    .map((id) => DETAIL_BY_ID[id]?.label)
    .filter(Boolean);
  return [r.text, ...categoryLabels, ...detailLabels, r.powerWord, formatDate(r.createdAt)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}


// Reasons Master: a master sheet of every Reason ever captured (across all
// saved sessions plus the one in progress), with its date. Each reason can be
// edited, archived or deleted here. It never drops data on its own.
export default function ReasonsMasterPage() {
  const navigate = useNavigate();
  const {
    reasons: rawReasons,
    sessionId,
    createdAt,
    hasActiveSession,
    updateReasonText,
    toggleCategory,
    toggleDetail,
    setPowerWord,
    archiveReason,
    unarchiveReason,
    removeReason,
    persist,
    reset,
    startSession,
  } = useAssessmentFlow();

  // Reason id currently open in the full edit panel (null = closed). The panel
  // is the SAME one used by the Previous Assessment detail screen.
  const [editingId, setEditingId] = useState(null);

  // Add New Reasons: reuse the EXACT same flow as the sidebar's
  // "Start New Assessment" (reset → startSession → go to /new). Additive only;
  // no existing handler, state or routing is changed.
  const handleAddNewReasons = () => {
    reset();
    startSession();
    navigate('/reason-eliminator/new');
  };

  // Bumped after a mutation to a past (storage-only) session to force a re-read.
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  // Toggles between the active lists and the Archived view.
  const [showArchived, setShowArchived] = useState(false);
  // Recent filter (Latest / Last 3 / Last 5 / Last 10 / All / From–To). Only
  // shapes what is displayed — the stored reasons and every existing handler
  // are untouched.
  const [recent, setRecent] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Persist the in-progress session once on arrival so today's just-entered
  // reasons are saved and never lost from the master sheet.
  useEffect(() => {
    if (hasActiveSession && rawReasons.length > 0) persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge storage (source of truth) with the live current session so freshly
  // added reasons show even before they're persisted.
  const sessions = useMemo(() => {
    const stored = reasonEliminatorService.listSessions();
    if (!hasActiveSession || !sessionId) return stored;
    const exists = stored.some((s) => s.id === sessionId);
    if (exists) {
      return stored.map((s) =>
        s.id === sessionId ? { ...s, reasons: rawReasons } : s
      );
    }
    return [{ id: sessionId, createdAt, reasons: rawReasons }, ...stored];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawReasons, sessionId, createdAt, hasActiveSession, version]);

  // Map each reason id back to the session that owns it, so an edit/archive/
  // delete is routed to the right place (the live flow for the current session,
  // storage for any past one).
  const ownerById = useMemo(() => {
    const m = {};
    sessions.forEach((s) =>
      (s.reasons || []).forEach((r) => {
        m[r.id] = s.id;
      })
    );
    return m;
  }, [sessions]);

  // Only reasons that have a Power Word appear here. A reason with no Power Word
  // yet stays in storage (and the live session) untouched, just hidden from the
  // master sheet until its Power Word is filled in.
  const allRecords = useMemo(
    () =>
      sessions
        .flatMap((s) => (s.reasons || []).map((r) => ({ ...r })))
        .filter(hasPowerWord),
    [sessions]
  );
  // Active reasons drive the Today/Earlier sections; archived ones move out to
  // their own Archived section (so nothing shows struck-through in the lists).
  const activeRecords = useMemo(
    () => allRecords.filter((r) => !r.archived),
    [allRecords]
  );
  const archivedRecords = useMemo(
    () => allRecords.filter((r) => r.archived),
    [allRecords]
  );

  // Power Word choices for the editor's picker — the Power Word Exercise list
  // plus any custom Power Words already used anywhere. Deduped, exercise words
  // first. Same set the Previous Assessment detail editor offers.
  const powerWordOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    const add = (w) => {
      const word = (w || '').trim();
      if (!word || seen.has(word.toLowerCase())) return;
      seen.add(word.toLowerCase());
      out.push(word);
    };
    POWER_WORDS.forEach(add);
    allRecords.forEach((r) => add(r.powerWord));
    return out;
  }, [allRecords]);

  // The reason currently open in the full edit panel (looked up across every
  // record so both active and archived reasons can be edited).
  const editingReason = useMemo(
    () => allRecords.find((r) => r.id === editingId) || null,
    [allRecords, editingId]
  );

  // Apply the selected recent filter to a reason list by its creation date.
  // A non-"all" selection means the user is actively narrowing the list.
  const isFiltering = recent !== 'all';
  const range = { from: customFrom, to: customTo };

  // All active (non-archived) reasons in one list, newest first, shown together
  // in a single "Total Reasons" table with continuous numbering.
  const visibleActive = useMemo(
    () => filterRecent(activeRecords, recent, (r) => r.createdAt, range),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeRecords, recent, customFrom, customTo]
  );
  const visibleArchived = useMemo(
    () => filterRecent(archivedRecords, recent, (r) => r.createdAt, range),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [archivedRecords, recent, customFrom, customTo]
  );

  const isCurrent = (sid) => hasActiveSession && sid === sessionId;

  const editStorage = (sid, updater) => {
    const s = reasonEliminatorService.getSession(sid);
    if (!s) return;
    reasonEliminatorService.upsertSession({
      ...s,
      reasons: updater(Array.isArray(s.reasons) ? s.reasons : []),
    });
  };

  const handleUpdate = (id, text) => {
    const sid = ownerById[id];
    if (!sid) return;
    if (isCurrent(sid)) {
      updateReasonText(id, text);
      persist({
        reasons: rawReasons.map((r) => (r.id === id ? { ...r, text } : r)),
      });
    } else {
      editStorage(sid, (rs) => rs.map((r) => (r.id === id ? { ...r, text } : r)));
    }
    bump();
  };

  // Save the full edit panel (Reason text + Categories/Subcategories + Power
  // Word) for one reason. Routed exactly like handleUpdate: to the live flow for
  // the current session, or to storage for a past one. For the live session the
  // existing per-field flow actions are reused (text/category/detail/powerWord)
  // so the in-memory state stays in sync, then the merged reasons are persisted.
  const handleEditFull = (id, patch) => {
    const sid = ownerById[id];
    if (!sid) return;
    if (isCurrent(sid)) {
      const r = rawReasons.find((x) => x.id === id);
      if (r) {
        if ((patch.text ?? '') !== (r.text ?? '')) {
          updateReasonText(id, patch.text);
        }
        const curCats = Array.isArray(r.categories) ? r.categories : [];
        const nextCats = Array.isArray(patch.categories) ? patch.categories : [];
        curCats.forEach((c) => {
          if (!nextCats.includes(c)) toggleCategory(id, c);
        });
        nextCats.forEach((c) => {
          if (!curCats.includes(c)) toggleCategory(id, c);
        });
        const curDet = Array.isArray(r.details) ? r.details : [];
        const nextDet = Array.isArray(patch.details) ? patch.details : [];
        curDet.forEach((d) => {
          if (!nextDet.includes(d)) toggleDetail(id, d);
        });
        nextDet.forEach((d) => {
          if (!curDet.includes(d)) toggleDetail(id, d);
        });
        if ((patch.powerWord ?? '') !== (r.powerWord ?? '')) {
          setPowerWord(id, patch.powerWord);
        }
      }
      persist({
        reasons: rawReasons.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      });
    } else {
      editStorage(sid, (rs) =>
        rs.map((x) => (x.id === id ? { ...x, ...patch } : x))
      );
    }
    setEditingId(null);
    bump();
  };

  const handleArchive = (id) => {
    const sid = ownerById[id];
    if (!sid) return;
    if (isCurrent(sid)) {
      archiveReason(id);
      persist({
        reasons: rawReasons.map((r) =>
          r.id === id ? { ...r, archived: true } : r
        ),
      });
    } else {
      editStorage(sid, (rs) =>
        rs.map((r) => (r.id === id ? { ...r, archived: true } : r))
      );
    }
    bump();
  };

  const handleUnarchive = (id) => {
    const sid = ownerById[id];
    if (!sid) return;
    if (isCurrent(sid)) {
      unarchiveReason(id);
      persist({
        reasons: rawReasons.map((r) =>
          r.id === id ? { ...r, archived: false } : r
        ),
      });
    } else {
      editStorage(sid, (rs) =>
        rs.map((r) => (r.id === id ? { ...r, archived: false } : r))
      );
    }
    bump();
  };

  const handleDelete = (id) => {
    const sid = ownerById[id];
    if (!sid) return;
    if (isCurrent(sid)) {
      removeReason(id);
      persist({
        reasons: rawReasons
          .filter((r) => r.id !== id)
          .map((r, i) => ({ ...r, index: i, seq: i + 1 })),
      });
    } else {
      editStorage(sid, (rs) => rs.filter((r) => r.id !== id));
    }
    bump();
  };

  // Clear the entire Reasons Master history — every reason across all sessions
  // (active and archived). Grip Test scores/history are intentionally left
  // untouched. Additive action; the existing per-reason handlers are unchanged.
  const handleClearHistory = () => {
    if (
      !window.confirm(
        'Clear all reasons history? This permanently deletes every reason (active and archived) from the Reasons Master. Grip Test scores are kept. This cannot be undone.'
      )
    ) {
      return;
    }
    reasonEliminatorService.clearAll();
    reset();
    setShowArchived(false);
    bump();
  };

  const hasAny = allRecords.length > 0;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Master Sheet"
        title="Reasons Master"
        description="Every Reason you've captured, with its date. Edit, archive or delete any of them."
        actions={
          hasAny ? (
            <Button
              variant="danger"
              leftIcon={<FiTrash2 />}
              onClick={handleClearHistory}
            >
              Clear History
            </Button>
          ) : undefined
        }
      />

      {!hasAny ? (
        <EmptyState
          icon={<FiList size={20} />}
          title="No reasons yet"
          description="Start a new assessment from the sidebar to capture the Reasons that stop you. They'll appear here with their date."
        />
      ) : (
        <>
          {/* View switcher above the filter: Total Reasons · Archived. */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button
              variant={!showArchived ? 'primary' : 'secondary'}
              leftIcon={<FiList />}
              onClick={() => setShowArchived(false)}
            >
              Total Reasons
            </Button>
            <Button
              variant={showArchived ? 'primary' : 'secondary'}
              leftIcon={<FiArchive />}
              onClick={() => setShowArchived(true)}
            >
              Archived
              {archivedRecords.length ? ` (${archivedRecords.length})` : ''}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<FiPlay />}
              onClick={handleAddNewReasons}
            >
              Add New Reasons
            </Button>
          </div>

          <RecentFilterBar
            value={recent}
            onChange={setRecent}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          {showArchived ? (
            // Archived view — only archived reasons, with Unarchive to bring back.
            <section>
              <h2 className="text-lg font-semibold text-brand-black mb-3">
                Archived Reasons
              </h2>
              {visibleArchived.length > 0 ? (
                <ReasonsTable
                  reasons={visibleArchived}
                  showIndex
                  editable
                  onEditFull={(r) => setEditingId(r.id)}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                />
              ) : (
                <p className="text-sm text-brand-gray-900">
                  {archivedRecords.length === 0
                    ? 'No archived reasons yet.'
                    : 'No matching records found.'}
                </p>
              )}
            </section>
          ) : isFiltering && visibleActive.length === 0 ? (
            <p className="py-10 text-center text-sm text-brand-gray-900">
              No matching records found.
            </p>
          ) : (
            <div className="space-y-10">
              {/* Every active reason in a single table — today's and earlier
                  ones together, numbered continuously (R1, R2, R3, ...). */}
              <section>
                <h2 className="text-lg font-semibold text-brand-black mb-3">
                  Total Reasons
                </h2>
                {visibleActive.length > 0 ? (
                  <ReasonsTable
                    reasons={visibleActive}
                    showIndex
                    editable
                    onUpdate={handleUpdate}
                    onEditFull={(r) => setEditingId(r.id)}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ) : (
                  <p className="text-sm text-brand-gray-900">
                    No reasons yet.
                  </p>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {/* Full per-reason editor — Reason text, Category + Subcategory and Power
          Word, with "Save changes". Same panel the Previous Assessment detail
          screen uses. */}
      <Modal
        open={!!editingReason}
        onClose={() => setEditingId(null)}
        title={
          editingReason
            ? `Edit ${reasonNumber(
                editingReason,
                allRecords.findIndex((x) => x.id === editingReason.id)
              )}`
            : 'Edit Reason'
        }
        size="xl"
      >
        {editingReason ? (
          <ReasonEditPanel
            reason={editingReason}
            powerWordOptions={powerWordOptions}
            onSave={(patch) => handleEditFull(editingReason.id, patch)}
            onCancel={() => setEditingId(null)}
          />
        ) : null}
      </Modal>
    </PageTransition>
  );
}
