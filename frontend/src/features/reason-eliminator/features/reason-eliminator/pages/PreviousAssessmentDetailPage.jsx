import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Badge from '@/features/reason-eliminator/components/common/Badge.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import EmptyState from '@/features/reason-eliminator/components/common/EmptyState.jsx';
import { Table, THead, TBody, TR, TH, TD } from '@/features/reason-eliminator/components/common/Table.jsx';
import ReasonEditPanel from '../components/ReasonEditPanel.jsx';
import reasonEliminatorService from '../services/reasonEliminatorService.js';
import gripTestService from '../services/gripTestService.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import {
  visibleAssessmentReasons,
  isSessionAssessed,
} from '../utils/reasonVisibility.js';
import { formatDate, reasonNumber } from '../utils/formatters.js';
import {
  CATEGORY_BY_ID,
  CATEGORY_DETAILS,
  POWER_WORDS,
} from '../constants.js';

// How many reasons show per page in the assessment detail.
const DETAIL_PAGE = 5;

const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

// The "Edit" screen for one assessment: the paginated Reasons detail. Clicking a
// reason's Edit opens a full editor (Reason text, Category + Subcategory, Power
// Word). The assessment's own buttons (Edit/Delete/Archive/PDF/XLS) live on the
// list, not here.
export default function PreviousAssessmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Live flow — so a delete on the CURRENTLY ACTIVE session is mirrored in the
  // in-memory state too (the Reasons/Power Word Masters merge the active session
  // over storage, so without this they would keep showing a deleted reason).
  const { hasActiveSession, sessionId, removeReason } = useAssessmentFlow();
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  // Bumped after every edit/delete to re-read the session from storage.
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(0);
  // Reason id currently open in the editor modal (null = closed).
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setSession(reasonEliminatorService.getSession(id));
    setLoaded(true);
  }, [id, version]);

  // Chronological assessment number — earliest assessed session is 1, matching
  // the number on the Previous Assessments list.
  const number = useMemo(() => {
    const assessed = reasonEliminatorService
      .listSessions()
      .filter(isSessionAssessed)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    const idx = assessed.findIndex((s) => s.id === id);
    return idx === -1 ? null : idx + 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version]);

  // Power Word choices for the picker — the Power Word Exercise list plus any
  // custom Power Words already used anywhere. Deduped, exercise words first.
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
    reasonEliminatorService
      .listSessions()
      .forEach((s) => (s.reasons || []).forEach((r) => add(r.powerWord)));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // Apply all edited fields of one reason, then re-read.
  const saveReason = (rid, patch) => {
    const s = reasonEliminatorService.getSession(id);
    if (!s) return;
    reasonEliminatorService.upsertSession({
      ...s,
      reasons: (s.reasons || []).map((r) =>
        r.id === rid ? { ...r, ...patch } : r
      ),
    });
    setEditingId(null);
    setVersion((v) => v + 1);
  };

  const deleteReason = (rid) => {
    if (!window.confirm('Delete this reason? This cannot be undone.')) return;
    const s = reasonEliminatorService.getSession(id);
    if (!s) return;
    reasonEliminatorService.upsertSession({
      ...s,
      reasons: (s.reasons || []).filter((r) => r.id !== rid),
    });
    // Cascade the delete everywhere this reason (and its Power Word) shows up:
    // drop its saved grip score, and keep the live in-progress session in sync
    // so the Reasons Master and Power Word Master also drop it immediately.
    gripTestService.removeForReason(rid);
    if (hasActiveSession && sessionId === id) removeReason(rid);
    setVersion((v) => v + 1);
  };

  if (!loaded) return null;

  if (!session) {
    return (
      <PageTransition>
        <EmptyState
          title="Session not found"
          description="That assessment may have been removed."
          action={
            <Button
              leftIcon={<FiArrowLeft />}
              onClick={() => navigate('/reason-eliminator/previous')}
            >
              Back to history
            </Button>
          }
        />
      </PageTransition>
    );
  }

  const rows = visibleAssessmentReasons(session.reasons || []);
  const pageCount = Math.max(1, Math.ceil(rows.length / DETAIL_PAGE));
  const pg = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(pg * DETAIL_PAGE, pg * DETAIL_PAGE + DETAIL_PAGE);
  const heading = number ? `Assessment ${number}` : 'Assessment';
  const editingReason = rows.find((r) => r.id === editingId) || null;

  const catObjs = (r) =>
    (Array.isArray(r.categories)
      ? r.categories
      : r.category
      ? [r.category]
      : []
    )
      .map((cid) => CATEGORY_BY_ID[cid])
      .filter(Boolean);
  const detObjs = (r) =>
    (Array.isArray(r.details) ? r.details : [])
      .map((did) => DETAIL_BY_ID[did])
      .filter(Boolean);

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Assessment Detail"
        title={heading}
        description={`Date: ${formatDate(session.createdAt)}`}
      />

      <div className="surface-card p-4 md:p-5">
        <p className="mb-3 text-sm font-semibold text-brand-black">
          {heading} Detail
        </p>

        <Table>
          <THead>
            <TR>
              <TH className="w-14">R #</TH>
              <TH className="w-20">Date</TH>
              <TH className="w-[40%]">Reason</TH>
              <TH className="w-32">Categories</TH>
              <TH className="w-36">Subcategory</TH>
              <TH className="w-28">Power Word</TH>
              <TH align="right" className="w-px whitespace-nowrap">
                Action
              </TH>
            </TR>
          </THead>
          <TBody>
            {pageRows.map((r, idx) => (
              <motion.tr
                key={r.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="border-t border-brand-gray-100 hover:bg-brand-gray-50/70 cursor-pointer"
                onClick={() => setEditingId(r.id)}
              >
                <TD>
                  <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-brand-black text-white font-bold text-sm">
                    {reasonNumber(r, pg * DETAIL_PAGE + idx)}
                  </span>
                </TD>
                <TD className="text-brand-gray-900 text-sm">
                  {formatDate(r.createdAt)}
                </TD>
                <TD className="text-brand-ink">{r.text}</TD>
                <TD>
                  {catObjs(r).length === 0 ? (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {catObjs(r).map((c) => (
                        <Badge key={c.id} tone="red">
                          {c.code} · {c.label.replace('Lack of ', '')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TD>
                <TD>
                  {detObjs(r).length === 0 ? (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {detObjs(r).map((d) => (
                        <Badge key={d.id} tone="outline">
                          {d.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TD>
                <TD>
                  {r.powerWord ? (
                    <span className="font-semibold text-brand-black">
                      {r.powerWord}
                    </span>
                  ) : (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  )}
                </TD>
                <TD align="right">
                  <div
                    className="inline-flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<FiEdit2 />}
                      onClick={() => setEditingId(r.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<FiTrash2 />}
                      onClick={() => deleteReason(r.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TD>
              </motion.tr>
            ))}
          </TBody>
        </Table>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<FiChevronLeft />}
              disabled={pg === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              rightIcon={<FiChevronRight />}
              disabled={pg >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
          <Button
            variant="primary"
            leftIcon={<FiArrowLeft />}
            onClick={() => navigate('/reason-eliminator/previous')}
          >
            Back to Assessments
          </Button>
        </div>
      </div>

      {/* Per-reason editor: Reason text, Category + Subcategory, Power Word. */}
      <Modal
        open={!!editingReason}
        onClose={() => setEditingId(null)}
        title={
          editingReason
            ? `Edit ${reasonNumber(
                editingReason,
                rows.findIndex((x) => x.id === editingReason.id)
              )}`
            : 'Edit Reason'
        }
        size="xl"
      >
        {editingReason ? (
          <ReasonEditPanel
            reason={editingReason}
            powerWordOptions={powerWordOptions}
            onSave={(patch) => saveReason(editingReason.id, patch)}
            onCancel={() => setEditingId(null)}
          />
        ) : null}
      </Modal>
    </PageTransition>
  );
}
