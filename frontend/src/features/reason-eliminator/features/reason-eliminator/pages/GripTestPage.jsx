import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiArrowRight,
  FiStopCircle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiChevronDown,
  FiEdit2,
  FiX,
} from 'react-icons/fi';
import clsx from 'clsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Badge from '@/features/reason-eliminator/components/common/Badge.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import { Table, THead, TBody, TR, TH, TD } from '@/features/reason-eliminator/components/common/Table.jsx';
import GripEntryEditPanel from '../components/GripEntryEditPanel.jsx';
import { formatDate } from '../utils/formatters.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import reasonEliminatorService from '../services/reasonEliminatorService.js';
import gripTestService, { gripStatus } from '../services/gripTestService.js';
import gripHistoryService from '../services/gripHistoryService.js';
import { hasPowerWord } from '../utils/reasonVisibility.js';
import { CATEGORY_BY_ID, CATEGORY_DETAILS } from '../constants.js';

const SCORES = Array.from({ length: 6 }, (_, i) => i); // 0..5

const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

// How many reasons to grip-score per page (period).
const PER_PAGE_OPTIONS = [
  { value: 1, label: '1 Reason', count: 1 },
  { value: 3, label: '1-3 Reasons', count: 3 },
  { value: 5, label: '1-5 Reasons', count: 5 },
  { value: 7, label: '1-7 Reasons', count: 7 },
  { value: 'custom', label: 'Customize Range', count: null },
];
const MIN_CUSTOM = 1;
const MAX_CUSTOM = 50;

function monthKeyOf(input) {
  const d = typeof input === 'string' ? new Date(input) : input;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const catLabels = (r) =>
  (Array.isArray(r.categories) ? r.categories : r.category ? [r.category] : [])
    .map((id) => CATEGORY_BY_ID[id]?.label)
    .filter(Boolean)
    .join(', ');

const subLabels = (r) =>
  (Array.isArray(r.details) ? r.details : [])
    .map((id) => DETAIL_BY_ID[id]?.label)
    .filter(Boolean)
    .join(', ');

export default function GripTestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const flow = useAssessmentFlow();

  // Reasons to grip-test: every NON-archived reason across all saved sessions
  // (Previous Assessments + Reasons Master) plus the current in-progress one,
  // ordered oldest-first so the test starts from the first reason and moves on.
  const records = useMemo(() => {
    const stored = reasonEliminatorService.listSessions();
    let sessions = stored;
    if (flow.hasActiveSession && flow.sessionId) {
      const exists = stored.some((s) => s.id === flow.sessionId);
      if (exists) {
        sessions = stored.map((s) =>
          s.id === flow.sessionId ? { ...s, reasons: flow.reasons } : s
        );
      } else {
        sessions = [
          { id: flow.sessionId, createdAt: flow.createdAt, reasons: flow.reasons },
          ...stored,
        ];
      }
    }
    const ordered = [...sessions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const list = [];
    ordered.forEach((s) =>
      (s.reasons || []).forEach((r) => {
        // Skip reasons with no Power Word yet — they only join the Grip Test
        // queue once their Power Word is filled in. Nothing is removed from
        // storage; they're just held out of the queue until then.
        if (!r.archived && hasPowerWord(r)) list.push({ ...r, _sessionId: s.id });
      })
    );
    return list;
  }, [flow.hasActiveSession, flow.sessionId, flow.reasons, flow.createdAt]);

  const recordsKey = useMemo(() => records.map((r) => r.id).join('|'), [records]);

  // The grip-test queue is EVERY active reason, oldest first (Assessment 1's
  // reasons first, then later assessments). Nothing is skipped — already-scored
  // reasons still appear, so a Grip Test can be done as many times as wanted.
  const queue = records;
  const queueKey = recordsKey;

  // Reasons-per-page selection.
  const [perPage, setPerPage] = useState(PER_PAGE_OPTIONS[0]);
  const [customCount, setCustomCount] = useState(5);
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef(null);

  const boxCount =
    perPage.value === 'custom'
      ? Math.min(Math.max(customCount || MIN_CUSTOM, MIN_CUSTOM), MAX_CUSTOM)
      : perPage.count;

  // Index of the first reason on the current page.
  const [pageStart, setPageStart] = useState(0);
  // reasonId -> score for this test (pre-loaded from any saved grip scores).
  const [scores, setScores] = useState({});
  const [finished, setFinished] = useState(Boolean(location.state?.finished));
  const [lastRun, setLastRun] = useState(null);
  // Confirmation popup: null | 'incomplete'.
  const [modal, setModal] = useState(null);
  // Bumped after editing a score on the complete screen, to re-read the runs.
  const [historyVersion, setHistoryVersion] = useState(0);
  // Which run entry is being edited on the complete screen: { runId, reasonId }.
  const [editing, setEditing] = useState(null);
  // Reason ids scored during THIS visit (the current period). Drives which
  // reasons the run saves, so a later visit becomes its own separate run.
  const [periodIds, setPeriodIds] = useState([]);
  // The run this visit saved to — re-ending updates it instead of duplicating.
  const [currentRunId, setCurrentRunId] = useState(null);

  // Pre-load existing grip scores so revisiting shows what was entered.
  useEffect(() => {
    // The queue is already only unscored reasons, so start fresh from the top.
    setScores({});
    setPageStart(0);
    // A fresh visit is its own period and saves to its own run.
    setPeriodIds([]);
    setCurrentRunId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueKey]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!ddOpen) return undefined;
    const onDown = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ddOpen]);

  const total = queue.length;
  const pageReasons = queue.slice(pageStart, pageStart + boxCount);
  const isLastPage = pageStart + boxCount >= total;
  const scoredCount = queue.filter(
    (r) => typeof scores[r.id] === 'number'
  ).length;
  const pageAllScored = pageReasons.every(
    (r) => typeof scores[r.id] === 'number'
  );
  const progress = total ? Math.round((scoredCount / total) * 100) : 0;

  // ----- Continuation progress (additive; reads existing saved scores only).
  // The queue already excludes any reason that has a saved grip score, so these
  // figures simply describe the same state for the "continue from next pending"
  // indicators. No scoring, queue, or state logic is changed by them.
  const totalReasons = records.length;
  const completedReasons = totalReasons - queue.length;
  // The next reason still needing a score is the first one in the (unscored)
  // queue; its human number continues the overall sequence (R1, R2, ...).
  const nextReasonNumber = completedReasons + 1;
  // Prior progress exists (some scored already) but pending reasons remain.
  const hasPriorProgress = completedReasons > 0 && queue.length > 0;

  // Whether every in-scope reason now has a saved grip score. Reads the live
  // per-reason store (so it reflects scores saved during this visit) and also
  // re-derives after edits — used only for the "all reasons completed" copy.
  const allReasonsCompleted = useMemo(() => {
    if (records.length === 0) return false;
    return records.every((r) => {
      const rec = gripTestService.getForReason(r.id);
      return rec && typeof rec.score === 'number';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsKey, scores, historyVersion]);

  const setScore = (r, n) => {
    setScores((prev) => ({ ...prev, [r.id]: n }));
    setPeriodIds((prev) => (prev.includes(r.id) ? prev : [...prev, r.id]));
    gripTestService.saveRecord({
      reasonId: r.id,
      sessionId: r._sessionId,
      seq: r.seq,
      text: r.text,
      date: r.createdAt,
      score: n,
    });
    // Stay on the current reason after scoring — advancing to the next reason
    // happens only when the user clicks Next.
  };

  const selectPerPage = (opt) => {
    setPerPage(opt);
    setPageStart(0);
    setDdOpen(false);
  };

  // Save THIS period's reasons as a run, then show the complete screen. If this
  // visit already saved a run, re-ending updates that same run (edits the older
  // one) instead of adding the same details again.
  const finishRun = () => {
    const periodReasons = records.filter(
      (r) => periodIds.includes(r.id) && typeof scores[r.id] === 'number'
    );
    if (periodReasons.length === 0) {
      setModal('incomplete');
      return;
    }
    const entries = periodReasons.map((r, i) => ({
      reasonId: r.id,
      seq: i + 1,
      text: r.text,
      score: scores[r.id],
    }));
    let run;
    if (
      currentRunId &&
      gripHistoryService.getRuns().some((x) => x.id === currentRunId)
    ) {
      run = gripHistoryService.updateRun(currentRunId, entries);
    } else {
      run = gripHistoryService.addRun(entries, monthKeyOf(new Date()));
      setCurrentRunId(run.id);
    }
    setLastRun(run);
    setHistoryVersion((v) => v + 1);
    setFinished(true);
  };

  const handleNext = () => {
    if (!pageAllScored) {
      setModal('incomplete');
      return;
    }
    if (isLastPage) {
      finishRun();
      return;
    }
    setPageStart((p) => p + boxCount);
  };

  const handlePrevious = () => {
    if (pageStart > 0) setPageStart((p) => Math.max(0, p - boxCount));
  };

  const handleEnd = () => {
    if (!pageAllScored) {
      setModal('incomplete');
      return;
    }
    finishRun();
  };

  // The Complete screen shows ONLY the run this visit just saved (re-read from
  // storage so edits made on the Complete screen are reflected).
  const historyRuns = useMemo(() => {
    if (!finished) return [];
    const id = lastRun?.id || currentRunId;
    const fresh = id
      ? gripHistoryService.getRuns().find((r) => r.id === id)
      : null;
    if (fresh) return [fresh];
    return lastRun ? [lastRun] : [];
  }, [finished, lastRun, currentRunId, historyVersion]);

  // Edit a grip score from the complete screen: update the saved run AND the
  // per-reason store (so the Dashboard stays in sync), then refresh.
  const editEntryScore = (runId, entry, sc) => {
    gripHistoryService.updateEntryScore(runId, entry.reasonId, sc);
    const r = records.find((x) => x.id === entry.reasonId);
    gripTestService.saveRecord({
      reasonId: entry.reasonId,
      sessionId: r?._sessionId,
      seq: entry.seq,
      text: entry.text,
      date: r?.createdAt,
      score: sc,
    });
    setEditing(null);
    setHistoryVersion((v) => v + 1);
  };

  // Save the Reason text + Grip Score edited in the Complete-screen modal:
  // update the saved run (text + score) AND the per-reason store (so the
  // Dashboard stays in sync), then refresh.
  const saveEntry = (runId, entry, { text, score }) => {
    gripHistoryService.updateEntryScore(runId, entry.reasonId, score);
    gripHistoryService.updateEntryText(runId, entry.reasonId, text);
    const r = records.find((x) => x.id === entry.reasonId);
    gripTestService.saveRecord({
      reasonId: entry.reasonId,
      sessionId: r?._sessionId,
      seq: entry.seq,
      text,
      date: r?.createdAt,
      score,
    });
    setEditing(null);
    setHistoryVersion((v) => v + 1);
  };

  // Start a fresh Grip Test from the Complete screen — clear this run's scores
  // and return to the scoring page.
  const startNewGripTest = () => {
    setEditing(null);
    setLastRun(null);
    setCurrentRunId(null);
    setPeriodIds([]);
    setScores({});
    setPageStart(0);
    setFinished(false);
  };

  // -------------------------------------------------------------- Complete
  if (finished) {
    // The run + entry currently open in the edit modal (null = closed).
    const editRun = editing
      ? historyRuns.find((r) => r.id === editing.runId)
      : null;
    const editEntry = editRun
      ? (editRun.entries || []).find((e) => e.reasonId === editing.reasonId)
      : null;
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-red-soft text-brand-red mb-5">
              <FiCheckCircle size={26} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-brand-black tracking-tight">
              Grip Test Complete
            </h1>
            <p className="mt-2 text-sm text-brand-gray-900">
              Your grip scores have been saved successfully.
            </p>
            {allReasonsCompleted ? (
              <p className="mt-1 text-sm font-semibold text-brand-red">
                All selected reasons have received grip scores.
              </p>
            ) : null}
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              leftIcon={<FiClock />}
              onClick={() => navigate('/reason-eliminator/grip-history')}
            >
              View Grip History
            </Button>
            <Button
              variant="secondary"
              rightIcon={<FiArrowRight />}
              onClick={startNewGripTest}
            >
              Start New Grip Test
            </Button>
          </div>

          <div className="space-y-10">
            {historyRuns.map((run) => (
              <div key={run.id}>
                <p className="mb-2 text-sm font-semibold text-brand-black">
                  Grip Test
                  <span className="ml-2 font-normal text-brand-gray-900">
                    {formatDate(run.date)}
                  </span>
                </p>
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-20">R No.</TH>
                      <TH>Reason</TH>
                      <TH className="w-56 whitespace-nowrap">Grip Score</TH>
                      <TH className="w-48">Grip Status</TH>
                      <TH align="right" className="w-32 whitespace-nowrap">
                        Action
                      </TH>
                    </TR>
                  </THead>
                  <TBody>
                    {run.entries.map((e, i) => (
                      <TR
                        key={e.reasonId}
                        className="border-t border-brand-gray-100"
                      >
                        <TD>
                          <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-brand-black text-white font-bold text-sm">
                            R{i + 1}
                          </span>
                        </TD>
                        <TD className="text-brand-ink">{e.text}</TD>
                        <TD>
                          <span className="font-bold text-brand-black">
                            {e.score}
                          </span>
                        </TD>
                        <TD>
                          <Badge tone="red">{e.status}</Badge>
                        </TD>
                        <TD align="right">
                          <Button
                            size="sm"
                            variant="secondary"
                            leftIcon={<FiEdit2 />}
                            onClick={() =>
                              setEditing({ runId: run.id, reasonId: e.reasonId })
                            }
                          >
                            Edit
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            ))}
          </div>
        </div>

        {/* Per-entry editor — Reason + Grip Score (same shape as the Previous
            Assessment detail editor). */}
        <Modal
          open={!!editEntry}
          onClose={() => setEditing(null)}
          title="Edit Reason"
          size="lg"
        >
          {editEntry ? (
            <GripEntryEditPanel
              entry={editEntry}
              onSave={(patch) => saveEntry(editing.runId, editEntry, patch)}
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </Modal>
      </PageTransition>
    );
  }

  // --------------------------------------------------------------- Review
  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto">
        {/* Heading — same style as Start New Assessment (title + subtitle). */}
        <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
          Grip Test
        </h1>
        <p className="mt-2 text-sm text-brand-gray-900">
          Rate how strong a grip each Reason has on you, from 0 to 5.
        </p>

        {total === 0 ? (
          <div className="surface-card mt-8 p-8 md:p-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-red-soft text-brand-red mb-4">
              <FiCheckCircle size={22} />
            </div>
            <h2 className="text-lg font-bold text-brand-black">
              {records.length > 0
                ? 'Grip Test completed'
                : 'No reasons to review yet'}
            </h2>
            {records.length > 0 ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-red">
                <FiCheckCircle /> Completed
              </p>
            ) : null}
            <p className="mt-2 text-sm text-brand-gray-900">
              {records.length > 0
                ? 'You have given a grip score to all your reasons. New reasons will appear here for their own Grip Test.'
                : "Once you add reasons (and don't archive them), they appear here for the Grip Test."}
            </p>
          </div>
        ) : (
          <>
            {/* Card 1 — Reasons Per Page selector. */}
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

                <div ref={ddRef} className="relative w-48 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDdOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={ddOpen}
                    className={clsx(
                      'w-full h-11 px-4 flex items-center justify-between gap-2 rounded-xl bg-white text-sm font-semibold text-brand-black border transition-colors',
                      ddOpen
                        ? 'border-brand-red ring-2 ring-brand-red/15'
                        : 'border-brand-gray-200 hover:border-brand-gray-300'
                    )}
                  >
                    <span className="truncate">{perPage.label}</span>
                    <FiChevronDown
                      className={clsx(
                        'shrink-0 transition-transform',
                        ddOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {ddOpen ? (
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
                              onClick={() => selectPerPage(opt)}
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
                      setPageStart(0);
                    }}
                    onBlur={() =>
                      setCustomCount(
                        Math.min(
                          Math.max(Number(customCount) || MIN_CUSTOM, MIN_CUSTOM),
                          MAX_CUSTOM
                        )
                      )
                    }
                    className="w-24 h-10 px-3 rounded-xl bg-white text-brand-ink border border-brand-gray-200 hover:border-brand-gray-300 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
                  />
                  <span className="text-xs text-brand-gray-400">
                    (max {MAX_CUSTOM})
                  </span>
                </div>
              ) : null}
            </div>

            {/* Progress */}
            <div className="mt-6 mb-3">
              <div className="flex items-center justify-between text-sm text-brand-gray-900 mb-2">
                <span>
                  Reasons {pageStart + 1}-{Math.min(pageStart + boxCount, total)}{' '}
                  of {total}
                </span>
                <span>
                  {scoredCount} of {total} scored · {progress}%
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

            {/* Card 2 — the reason score blocks for this page. */}
            <div className="surface-card p-6 md:p-8">
              <div className="flex flex-col gap-8">
                {pageReasons.map((r, i) => {
                  const sc = scores[r.id];
                  return (
                    <div key={r.id}>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-red mb-2">
                        Reason {i + 1}
                      </p>
                      <p className="text-base md:text-lg font-semibold text-brand-black leading-snug">
                        {r.text}
                      </p>
                      <p className="mt-1 text-xs text-brand-gray-900">
                        {formatDate(r.createdAt)}
                        {catLabels(r) ? ` · ${catLabels(r)}` : ''}
                        {subLabels(r) ? ` · ${subLabels(r)}` : ''}
                        {r.powerWord ? ` · Power Word: ${r.powerWord}` : ''}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {SCORES.map((n) => {
                          const active = sc === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScore(r, n)}
                              className={clsx(
                                'inline-flex items-center justify-center w-11 h-11 rounded-xl border text-base font-bold transition-colors',
                                active
                                  ? 'border-brand-red bg-brand-red text-white shadow-sm shadow-brand-red/20'
                                  : 'border-brand-gray-200 bg-white text-brand-ink hover:border-brand-gray-300 hover:bg-brand-gray-50'
                              )}
                            >
                              {n}
                            </button>
                          );
                        })}
                        <span className="ml-1">
                          {typeof sc === 'number' ? (
                            <Badge tone="red">{gripStatus(sc)}</Badge>
                          ) : (
                            <span className="text-sm text-brand-gray-400">
                              Select a score
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer actions */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  variant="primary"
                  leftIcon={<FiArrowLeft />}
                  onClick={handlePrevious}
                  disabled={pageStart === 0}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    leftIcon={<FiStopCircle />}
                    onClick={handleEnd}
                  >
                    End
                  </Button>
                  <Button onClick={handleNext} rightIcon={<FiArrowRight />}>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        open={modal === 'incomplete'}
        onClose={() => setModal(null)}
        title="Score your reasons"
        description="Please give a grip score (0–5) to every reason on this page to continue."
        size="sm"
        footer={<Button onClick={() => setModal(null)}>Continue</Button>}
      />
    </PageTransition>
  );
}
