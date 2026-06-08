import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import GripEntryEditPanel from '../components/GripEntryEditPanel.jsx';
import gripHistoryService from '../services/gripHistoryService.js';
import gripTestService, { gripStatus } from '../services/gripTestService.js';
import { formatDate } from '../utils/formatters.js';

const DETAIL_PAGE = 5;

// The "Edit" screen for one Grip Test run: the paginated entries with editable
// scores. Mirrors the assessment detail screen (no top action buttons).
export default function GripHistoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState(0);
  // reasonId currently being edited inline (null = none).
  const [editing, setEditing] = useState(null);

  const runs = useMemo(
    () => gripHistoryService.getRuns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );
  const run = runs.find((r) => r.id === id) || null;

  // Chronological number — earliest Grip Test is 1, matching the list.
  const number = useMemo(() => {
    const ordered = [...runs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const idx = ordered.findIndex((r) => r.id === id);
    return idx === -1 ? null : idx + 1;
  }, [runs, id]);

  useEffect(() => {
    setPage(0);
  }, [id]);

  // Save the Reason text + Grip Score edited in the modal: update the run (text
  // and score) AND the per-reason store (so the Dashboard stays in sync).
  const saveEntry = (entry, { text, score }) => {
    gripHistoryService.updateEntryScore(id, entry.reasonId, score);
    gripHistoryService.updateEntryText(id, entry.reasonId, text);
    gripTestService.saveRecord({
      reasonId: entry.reasonId,
      seq: entry.seq,
      text,
      score,
    });
    setEditing(null);
    setVersion((v) => v + 1);
  };

  // Delete a single reason entry from this Grip Test run, after confirming.
  const deleteEntry = (reasonId) => {
    if (!window.confirm('Delete this reason from the Grip Test? This cannot be undone.'))
      return;
    gripHistoryService.deleteEntry(id, reasonId);
    setVersion((v) => v + 1);
  };

  if (!run) {
    return (
      <PageTransition>
        <EmptyState
          title="Grip Test not found"
          description="That Grip Test may have been removed."
          action={
            <Button
              leftIcon={<FiArrowLeft />}
              onClick={() => navigate('/reason-eliminator/grip-history')}
            >
              Back to Grip History
            </Button>
          }
        />
      </PageTransition>
    );
  }

  const entries = run.entries || [];
  const pageCount = Math.max(1, Math.ceil(entries.length / DETAIL_PAGE));
  const pg = Math.min(page, pageCount - 1);
  const pageEntries = entries.slice(pg * DETAIL_PAGE, pg * DETAIL_PAGE + DETAIL_PAGE);
  const heading = number ? `Grip Test ${number}` : 'Grip Test';
  const editingEntry = entries.find((e) => e.reasonId === editing) || null;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Grip Test Detail"
        title={heading}
        description={`Date: ${formatDate(run.date)}`}
      />

      <div className="surface-card p-4 md:p-5">
        <p className="mb-3 text-sm font-semibold text-brand-black">
          {heading} Detail
        </p>

        <Table>
          <THead>
            <TR>
              <TH className="w-20">R #</TH>
              <TH>Reason</TH>
              <TH className="w-56 whitespace-nowrap">Grip Score</TH>
              <TH className="w-48">Grip Status</TH>
              <TH align="right" className="w-44 whitespace-nowrap">
                Action
              </TH>
            </TR>
          </THead>
          <TBody>
            {pageEntries.map((e, i) => (
              <TR key={e.reasonId} className="border-t border-brand-gray-100">
                <TD>
                  <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-brand-black text-white font-bold text-sm">
                    R{pg * DETAIL_PAGE + i + 1}
                  </span>
                </TD>
                <TD className="text-brand-ink">{e.text}</TD>
                <TD>
                  <span className="font-bold text-brand-black">{e.score}</span>
                </TD>
                <TD>
                  <Badge tone="red">{e.status || gripStatus(e.score)}</Badge>
                </TD>
                <TD align="right">
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<FiEdit2 />}
                      onClick={() => setEditing(e.reasonId)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<FiTrash2 />}
                      onClick={() => deleteEntry(e.reasonId)}
                    >
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
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
            onClick={() => navigate('/reason-eliminator/grip-history')}
          >
            Back to Grip History
          </Button>
        </div>
      </div>

      {/* Per-entry editor — Reason + Grip Score (same shape as the Previous
          Assessment detail editor). */}
      <Modal
        open={!!editingEntry}
        onClose={() => setEditing(null)}
        title="Edit Reason"
        size="lg"
      >
        {editingEntry ? (
          <GripEntryEditPanel
            entry={editingEntry}
            onSave={(patch) => saveEntry(editingEntry, patch)}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </PageTransition>
  );
}
