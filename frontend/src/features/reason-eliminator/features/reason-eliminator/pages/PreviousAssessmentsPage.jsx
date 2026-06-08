import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiClock,
  FiPlay,
  FiTrash2,
  FiArchive,
  FiArrowLeft,
  FiEdit2,
  FiDownload,
  FiFileText,
  FiZap,
  FiRotateCcw,
} from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import EmptyState from '@/features/reason-eliminator/components/common/EmptyState.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import { Table, THead, TBody, TR, TH, TD } from '@/features/reason-eliminator/components/common/Table.jsx';
import ReasonsTable from '../components/ReasonsTable.jsx';
import RecentFilterBar from '../components/RecentFilterBar.jsx';
import PowerWordPicker from '../components/PowerWordPicker.jsx';
import useAssessments from '../hooks/useAssessments.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import reasonEliminatorService from '../services/reasonEliminatorService.js';
import gripTestService from '../services/gripTestService.js';
import { formatDate } from '../utils/formatters.js';
import { filterRecent } from '../utils/recentFilter.js';
import {
  isSessionAssessed,
  visibleAssessmentReasons,
} from '../utils/reasonVisibility.js';
import { CATEGORY_BY_ID, CATEGORY_DETAILS, POWER_WORDS } from '../constants.js';

// Flat lookup of every subcategory (reason detail) by its id, so a reason's
// saved `details` ids can be turned back into their human labels.
const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

const catLabel = (r) =>
  (Array.isArray(r.categories) ? r.categories : r.category ? [r.category] : [])
    .map((id) => CATEGORY_BY_ID[id]?.label)
    .filter(Boolean)
    .join('; ');

const subLabel = (r) =>
  (Array.isArray(r.details) ? r.details : [])
    .map((id) => DETAIL_BY_ID[id]?.label)
    .filter(Boolean)
    .join('; ');

// All searchable text for a single record (reason), used by the History search:
// its reason text, category label(s), subcategory label(s), power word and the
// displayed date. Lower-cased so matching is case-insensitive.
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
  return [
    r.text,
    ...categoryLabels,
    ...detailLabels,
    r.powerWord,
    formatDate(r.createdAt),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function PreviousAssessmentsPage() {
  const navigate = useNavigate();
  const { sessions: allSessions, remove, clearAll, refresh } = useAssessments();
  const { reset, startSession, hasActiveSession, sessionId, removeReason } =
    useAssessmentFlow();

  // Edit/archive/delete a single reason inside a saved session, then refresh.
  const editSessionReason = (sid, id, updater) => {
    const sess = reasonEliminatorService.getSession(sid);
    if (!sess) return;
    const reasons = (sess.reasons || []).map((r) =>
      r.id === id ? updater(r) : r
    );
    reasonEliminatorService.upsertSession({ ...sess, reasons });
    refresh();
  };

  const deleteSessionReason = (sid, id) => {
    const sess = reasonEliminatorService.getSession(sid);
    if (!sess) return;
    const reasons = (sess.reasons || []).filter((r) => r.id !== id);
    reasonEliminatorService.upsertSession({ ...sess, reasons });
    // Cascade: drop the reason's grip score, and sync the live session so the
    // Reasons Master / Power Word Master also drop it right away.
    gripTestService.removeForReason(id);
    if (hasActiveSession && sessionId === sid) removeReason(id);
    refresh();
  };

  // --- Per-reason exports --------------------------------------------------
  const EXPORT_COLUMNS = ['Date', 'Reason', 'Category', 'Subcategory', 'Power Word'];
  const rowFor = (r) => [
    formatDate(r.createdAt),
    r.text || '',
    catLabel(r),
    subLabel(r),
    r.powerWord || '',
  ];
  const fileSlug = (r) =>
    (r.text || 'reason')
      .slice(0, 24)
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'reason';

  const exportReasonExcel = (r) => {
    const csvCell = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [EXPORT_COLUMNS, rowFor(r)]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reason-${fileSlug(r)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportReasonPdf = (r) => {
    const esc = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const body = `<tr>${rowFor(r)
      .map((c) => `<td>${esc(c)}</td>`)
      .join('')}</tr>`;
    const html = `<!doctype html><html><head><title>Reason</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:Inter,Arial,sans-serif;color:#1A1A1D;padding:24px;}
        h1{font-size:20px;margin:0 0 4px;}
        p{color:#52525B;margin:0 0 16px;font-size:12px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{border:1px solid #E4E4E7;padding:8px 10px;text-align:left;vertical-align:top;}
        th{background:#F7F7F8;text-transform:uppercase;font-size:10px;letter-spacing:.06em;}
      </style></head><body>
      <h1>Reason</h1>
      <p>${esc(formatDate(r.createdAt))}</p>
      <table><thead><tr>${EXPORT_COLUMNS.map((c) => `<th>${c}</th>`).join(
        ''
      )}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // Show sessions whose assessment is finished — every active reason has a
  // category, subcategory and power word. The Grip Test is not required, so a
  // session appears here (updating the Current/Previous sections) as soon as the
  // Power Word step is complete, even before the Grip Test is done.
  const sessions = useMemo(
    () => allSessions.filter(isSessionAssessed),
    [allSessions]
  );

  // Recent filter (Latest / Last 3 / Last 5 / Last 10 / All / From–To). Only
  // shapes which assessments are displayed; the stored sessions are untouched.
  const [recent, setRecent] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  // Toggles between the assessment history and the Archived reasons view.
  const [showArchived, setShowArchived] = useState(false);

  // Every archived reason across all sessions, plus a lookup of which session
  // owns each one (so unarchive/edit/delete routes to the right session).
  const archivedReasons = useMemo(
    () => allSessions.flatMap((s) => (s.reasons || []).filter((r) => r.archived)),
    [allSessions]
  );
  const archivedOwnerById = useMemo(() => {
    const m = {};
    allSessions.forEach((s) =>
      (s.reasons || []).forEach((r) => {
        if (r.archived) m[r.id] = s.id;
      })
    );
    return m;
  }, [allSessions]);

  // Wholly-archived assessments: a session whose every reason is archived (the
  // whole assessment was archived from here). The Archived view shows each of
  // these as ONE unit — exactly how Grip History archives a whole run, rather
  // than scattering the assessment's reasons as individual rows.
  const archivedSessions = useMemo(
    () =>
      allSessions.filter(
        (s) =>
          Array.isArray(s.reasons) &&
          s.reasons.length > 0 &&
          s.reasons.every((r) => r.archived)
      ),
    [allSessions]
  );
  // Stable numbers for archived assessments by creation order (oldest = 1).
  const archivedNumberById = useMemo(() => {
    const ordered = [...archivedSessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const m = {};
    ordered.forEach((s, i) => {
      m[s.id] = i + 1;
    });
    return m;
  }, [archivedSessions]);

  // Map every reason id (any session) to its owning session, so a Power Word
  // edit from the Missing Power Word popup routes to the right session.
  const ownerById = useMemo(() => {
    const m = {};
    allSessions.forEach((s) =>
      (s.reasons || []).forEach((r) => {
        m[r.id] = s.id;
      })
    );
    return m;
  }, [allSessions]);

  // Power Word choices for the dropdown — exactly the ones offered by the Power
  // Word Exercise (POWER_WORDS), plus any custom Power Words the user already
  // created across their assessments. Deduped, exercise words first.
  const powerWordOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    const add = (w) => {
      const word = (w || '').trim();
      if (!word) return;
      const key = word.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(word);
    };
    POWER_WORDS.forEach(add);
    allSessions.forEach((s) =>
      (s.reasons || []).forEach((r) => add(r.powerWord))
    );
    return out;
  }, [allSessions]);

  // Active (non-archived) reasons anywhere that still have no Power Word. A
  // Power Word is mandatory, so these must be filled in before anything else.
  const missingReasons = useMemo(
    () =>
      allSessions.flatMap((s) =>
        (s.reasons || [])
          .filter((r) => !r.archived && !(r.powerWord || '').trim())
          .map((r) => ({ reason: r, sessionId: s.id }))
      ),
    [allSessions]
  );

  // Stable assessment numbers by creation order: the earliest assessment is
  // Assessment 1, the next is 2, and so on — independent of the current sort or
  // filter, so a box's number never changes when the list is reordered.
  const assessmentNumberById = useMemo(() => {
    const ordered = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const m = {};
    ordered.forEach((s, i) => {
      m[s.id] = i + 1;
    });
    return m;
  }, [sessions]);

  // Whether the user manually opened the Missing Power Word popup (it always
  // opens on its own when any Power Word is still missing).
  const [missingManual, setMissingManual] = useState(false);

  // The Missing Power Word popup is open automatically whenever some Power Word
  // is missing (mandatory), or when the user opened it from the header button.
  const missingOpen = missingReasons.length > 0 || missingManual;
  const mustFix = missingReasons.length > 0;

  // Set / change a reason's Power Word (used by the Missing Power Word popup).
  const setPowerWordFor = (id, word) => {
    const sid = ownerById[id];
    if (!sid) return;
    editSessionReason(sid, id, (r) => ({ ...r, powerWord: word }));
  };

  // Archive a whole assessment — every reason in it moves to Archived (it can be
  // unarchived later). The stored data is preserved; only the archived flag flips.
  const archiveSession = (sid) => {
    if (
      !window.confirm(
        'Archive this whole assessment? All of its reasons move to Archived. You can unarchive them later.'
      )
    ) {
      return;
    }
    const sess = reasonEliminatorService.getSession(sid);
    if (!sess) return;
    reasonEliminatorService.upsertSession({
      ...sess,
      reasons: (sess.reasons || []).map((r) => ({ ...r, archived: true })),
    });
    refresh();
  };

  // Unarchive a whole assessment — every reason in it returns to active. The
  // mirror of archiveSession; restores the whole unit back to the main list.
  const unarchiveSession = (sid) => {
    const sess = reasonEliminatorService.getSession(sid);
    if (!sess) return;
    reasonEliminatorService.upsertSession({
      ...sess,
      reasons: (sess.reasons || []).map((r) => ({ ...r, archived: false })),
    });
    refresh();
  };

  // Whole-assessment exports (every visible reason in the session).
  const exportSessionExcel = (session) => {
    const csvCell = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = visibleAssessmentReasons(session.reasons || []).map(rowFor);
    const lines = [EXPORT_COLUMNS, ...rows]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + lines], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-${fileSlug({ text: formatDate(session.createdAt) })}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSessionPdf = (session) => {
    const esc = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const body = visibleAssessmentReasons(session.reasons || [])
      .map((r) => `<tr>${rowFor(r).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html><html><head><title>Assessment</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:Inter,Arial,sans-serif;color:#1A1A1D;padding:24px;}
        h1{font-size:20px;margin:0 0 4px;}
        p{color:#52525B;margin:0 0 16px;font-size:12px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{border:1px solid #E4E4E7;padding:8px 10px;text-align:left;vertical-align:top;}
        th{background:#F7F7F8;text-transform:uppercase;font-size:10px;letter-spacing:.06em;}
      </style></head><body>
      <h1>Assessment</h1>
      <p>${esc(formatDate(session.createdAt))}</p>
      <table><thead><tr>${EXPORT_COLUMNS.map((c) => `<th>${c}</th>`).join(
        ''
      )}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  // Group each completed assessment with its visible records, keeping the
  // record's original R-number. The section's "Current/Previous" label is
  // driven by the original position so it stays stable. The recent filter then
  // keeps only the most recent N assessments (or those inside the From–To
  // range); empty groups drop out.
  const filteredSessions = useMemo(() => {
    const groups = sessions
      .map((s, idx) => {
        const rows = visibleAssessmentReasons(s.reasons).map((r, i) => ({
          reason: r,
          num: i + 1,
        }));
        return { session: s, isCurrent: idx === 0, rows };
      })
      .filter((group) => group.rows.length > 0);
    return filterRecent(groups, recent, (g) => g.session.createdAt, {
      from: customFrom,
      to: customTo,
    });
  }, [sessions, recent, customFrom, customTo]);

  // Archived assessments after the recent filter — same filter as the main list.
  const filteredArchived = useMemo(
    () =>
      filterRecent(archivedSessions, recent, (s) => s.createdAt, {
        from: customFrom,
        to: customTo,
      }),
    [archivedSessions, recent, customFrom, customTo]
  );

  // Delete a session; if it was the last one, all previous data is now gone —
  // clear any lingering in-memory flow so the next assessment starts fresh.
  const handleDelete = (id) => {
    // Cascade: drop every grip score for the assessment's reasons, and if it is
    // the live in-progress session, clear the in-memory flow too so nothing
    // lingers in the Reasons Master / Power Word Master.
    const sess = reasonEliminatorService.getSession(id);
    (sess?.reasons || []).forEach((r) => gripTestService.removeForReason(r.id));
    remove(id);
    if (hasActiveSession && sessionId === id) reset();
    if (sessions.length <= 1) reset();
  };

  // Wipe every saved session at once. Confirm first since this is irreversible,
  // then clear any lingering in-memory flow so the next assessment starts fresh.
  const handleClearAll = () => {
    if (
      window.confirm(
        'Clear all history? This permanently deletes every saved assessment and cannot be undone.'
      )
    ) {
      clearAll();
      reset();
    }
  };

  // Always begin a brand-new session (new id, no carried-over reasons) so the
  // next assessment starts from R1 — same fresh start as the Home screen.
  const handleStartNew = () => {
    reset();
    startSession();
    navigate('/reason-eliminator/new');
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="History"
        title="Previous Assessments"
        description="Open any past session to revisit your Reasons, Categories, and Power Words."
        actions={
          <Button
            variant="danger"
            leftIcon={<FiTrash2 />}
            onClick={handleClearAll}
          >
            Clear History
          </Button>
        }
      />

      {/* View switcher above the filter: Previous Assessment · Archived ·
          Missing Power Word. */}
      {sessions.length > 0 || archivedSessions.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Button
            variant={!showArchived ? 'primary' : 'secondary'}
            leftIcon={<FiClock />}
            onClick={() => setShowArchived(false)}
          >
            Previous Assessment
          </Button>
          <Button
            variant={showArchived ? 'primary' : 'secondary'}
            leftIcon={<FiArchive />}
            onClick={() => setShowArchived(true)}
          >
            Archived
            {archivedSessions.length ? ` (${archivedSessions.length})` : ''}
          </Button>
          <Button
            variant="secondary"
            leftIcon={<FiZap />}
            onClick={() => setMissingManual(true)}
          >
            Missing Power Word
            {missingReasons.length ? ` (${missingReasons.length})` : ''}
          </Button>
        </div>
      ) : null}

      {showArchived ? (
        // Archived view — each archived assessment as ONE whole unit (same card
        // as the main list), with Unarchive to bring the whole assessment back.
        <>
          <RecentFilterBar
            value={recent}
            onChange={setRecent}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          {filteredArchived.length === 0 ? (
            <p className="py-10 text-center text-sm text-brand-gray-900">
              {archivedSessions.length === 0
                ? 'No archived assessments yet.'
                : 'No matching records found.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredArchived.map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="surface-card p-4 md:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-brand-black">
                        Assessment {archivedNumberById[s.id]}
                      </p>
                      <p className="text-sm text-brand-gray-900">
                        Date: {formatDate(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiRotateCcw />}
                        onClick={() => unarchiveSession(s.id)}
                      >
                        Unarchive
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<FiTrash2 />}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this assessment? This cannot be undone.'
                            )
                          ) {
                            handleDelete(s.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<FiClock size={20} />}
          title="No previous assessments yet"
          description="Once you complete a session it will appear here, with the date and Reason breakdown."
          action={
            <Button
              leftIcon={<FiPlay />}
              onClick={handleStartNew}
            >
              Start your first assessment
            </Button>
          }
        />
      ) : (
        // Each completed assessment is grouped separately by its date, shown in
        // the same layout style as the Grip Test Complete screen: the most
        // recent session is the "Current section" and older sessions follow as
        // "Previous section" tables, newest first.
        <>
          <RecentFilterBar
            value={recent}
            onChange={setRecent}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          {filteredSessions.length === 0 ? (
            <p className="py-10 text-center text-sm text-brand-gray-900">
              No matching records found.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map(({ session: s }) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="surface-card p-4 md:p-5"
                >
                  {/* Assessment box: number + date, with actions. Edit opens the
                      detail on its own screen. */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-brand-black">
                        Assessment {assessmentNumberById[s.id]}
                      </p>
                      <p className="text-sm text-brand-gray-900">
                        Date: {formatDate(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiEdit2 />}
                        onClick={() =>
                          navigate(`/reason-eliminator/previous/${s.id}`)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<FiTrash2 />}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Delete this assessment? This cannot be undone.'
                            )
                          ) {
                            handleDelete(s.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiArchive />}
                        onClick={() => archiveSession(s.id)}
                      >
                        Archive
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiFileText />}
                        onClick={() => exportSessionPdf(s)}
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiDownload />}
                        onClick={() => exportSessionExcel(s)}
                      >
                        XLS
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Missing Power Word popup — mandatory while any reason has no Power Word
          (non-dismissible), and also openable from the header for review. */}
      <Modal
        open={missingOpen}
        onClose={() => {
          if (!mustFix) setMissingManual(false);
        }}
        title="Power Word required"
        description={
          mustFix
            ? 'Every reason must have a Power Word. Please assign one to each reason below to continue.'
            : 'All reasons already have a Power Word.'
        }
        size="xl"
        hideClose={mustFix}
        closeOnBackdrop={!mustFix}
        footer={
          <Button
            variant="primary"
            disabled={mustFix}
            onClick={() => setMissingManual(false)}
          >
            Done
          </Button>
        }
      >
        {missingReasons.length === 0 ? (
          <p className="text-sm text-brand-gray-900">
            No reasons are missing a Power Word.
          </p>
        ) : (
          <div className="-mx-2 px-2">
            <Table>
              <THead>
                <TR>
                  <TH className="w-32">Date</TH>
                  <TH>Reason</TH>
                  <TH className="w-64 whitespace-nowrap">Power Word</TH>
                </TR>
              </THead>
              <TBody>
                {missingReasons.map(({ reason: r }) => (
                  <TR key={r.id} className="border-t border-brand-gray-100">
                    <TD className="text-brand-gray-900 whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </TD>
                    <TD className="text-brand-ink">{r.text}</TD>
                    <TD>
                      <PowerWordPicker
                        options={powerWordOptions}
                        onPick={(w) => setPowerWordFor(r.id, w)}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
