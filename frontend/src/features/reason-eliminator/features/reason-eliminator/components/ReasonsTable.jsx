import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiEdit2,
  FiCheck,
  FiX,
  FiArchive,
  FiRotateCcw,
  FiTrash2,
  FiDownload,
  FiFileText,
} from 'react-icons/fi';
import { Table, THead, TBody, TR, TH, TD } from '@/features/reason-eliminator/components/common/Table.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Input from '@/features/reason-eliminator/components/common/Input.jsx';
import Badge from '@/features/reason-eliminator/components/common/Badge.jsx';
import Modal from '@/features/reason-eliminator/components/common/Modal.jsx';
import { reasonNumber, formatDate } from '../utils/formatters.js';
import { normalizeText, validateReason } from '../utils/validators.js';
import { CATEGORY_BY_ID, CATEGORY_DETAILS } from '../constants.js';
import gripTestService from '../services/gripTestService.js';

// Flat lookup of every subcategory (reason detail) by its id, so a reason's
// saved `details` ids can be turned back into their human labels.
const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

export default function ReasonsTable({
  reasons,
  showIndex = false,
  showCategory = false,
  showSubcategory = false,
  showPowerWord = false,
  showGripScore = false,
  showGripStatus = false,
  editable = false,
  indexOffset = 0,
  onUpdate,
  onEditFull,
  onArchive,
  onUnarchive,
  onDelete,
  onExportExcel,
  onExportPdf,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  // Id of the reason pending delete confirmation (null = modal closed).
  const [deleteId, setDeleteId] = useState(null);

  const { valid, message } = useMemo(() => validateReason(draft), [draft]);
  const showError = !valid && draft.trim().length > 0;

  const beginEdit = (reason) => {
    setEditingId(reason.id);
    setDraft(reason.text);
  };

  const commitEdit = () => {
    if (!valid || !editingId) return;
    onUpdate?.(editingId, normalizeText(draft));
    setEditingId(null);
    setDraft('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const confirmDelete = () => {
    if (deleteId) onDelete?.(deleteId);
    setDeleteId(null);
  };

  return (
    <>
    <Table>
      <THead>
        <TR>
          {showIndex ? <TH className="w-20">R #</TH> : null}
          <TH className="w-36">Date</TH>
          <TH>Reason</TH>
          {showCategory ? <TH className="w-48">Categories</TH> : null}
          {showSubcategory ? <TH className="w-56">Subcategory</TH> : null}
          {showPowerWord ? <TH className="w-44">Power Word</TH> : null}
          {showGripScore ? <TH className="w-32">Grip Score</TH> : null}
          {showGripStatus ? <TH className="w-48">Grip Status</TH> : null}
          {editable ? <TH align="right" className="whitespace-nowrap">Action</TH> : null}
        </TR>
      </THead>
      <TBody>
        {reasons.map((r, idx) => {
          const categoryIds = Array.isArray(r.categories)
            ? r.categories
            : r.category
            ? [r.category]
            : [];
          const categoryObjs = categoryIds
            .map((id) => CATEGORY_BY_ID[id])
            .filter(Boolean);
          const detailObjs = (Array.isArray(r.details) ? r.details : [])
            .map((id) => DETAIL_BY_ID[id])
            .filter(Boolean);
          // Grip score/status live in their own store, keyed by reason id.
          const grip =
            showGripScore || showGripStatus
              ? gripTestService.getForReason(r.id)
              : null;
          const isEditing = editingId === r.id;
          return (
            <motion.tr
              key={r.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="border-t border-brand-gray-100 hover:bg-brand-gray-50/70"
            >
              {showIndex ? (
                <TD>
                  <span className="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg bg-brand-black text-white font-bold text-sm">
                    {reasonNumber(r, indexOffset + idx)}
                  </span>
                </TD>
              ) : null}
              <TD className="text-brand-gray-900 whitespace-nowrap">
                {formatDate(r.createdAt)}
              </TD>
              <TD>
                {isEditing ? (
                  <div>
                    <Input
                      autoFocus
                      value={draft}
                      error={showError ? message : undefined}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={r.archived ? 'text-brand-gray-400 line-through' : 'text-brand-ink'}
                    >
                      {r.text}
                    </span>
                    {r.archived ? <Badge tone="neutral">Archived</Badge> : null}
                  </span>
                )}
              </TD>
              {showCategory ? (
                <TD>
                  {categoryObjs.length === 0 ? (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {categoryObjs.map((c) => (
                        <Badge
                          key={c.id}
                          tone="red"
                          title={c.label}
                        >
                          {c.code} &middot;{' '}
                          {c.label.replace('Lack of ', '')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TD>
              ) : null}
              {showSubcategory ? (
                <TD>
                  {detailObjs.length === 0 ? (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {detailObjs.map((d) => (
                        <Badge key={d.id} tone="outline">
                          {d.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TD>
              ) : null}
              {showPowerWord ? (
                <TD>
                  {r.powerWord ? (
                    <span className="font-semibold text-brand-black">
                      {r.powerWord}
                    </span>
                  ) : (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  )}
                </TD>
              ) : null}
              {showGripScore ? (
                <TD>
                  {grip && typeof grip.score === 'number' ? (
                    <span className="font-bold text-brand-black">
                      {grip.score}
                    </span>
                  ) : (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  )}
                </TD>
              ) : null}
              {showGripStatus ? (
                <TD>
                  {grip && grip.status ? (
                    <Badge tone="red">{grip.status}</Badge>
                  ) : (
                    <span className="text-brand-gray-400 text-sm">—</span>
                  )}
                </TD>
              ) : null}
              {editable ? (
                <TD align="right">
                  {isEditing ? (
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={commitEdit}
                        disabled={!valid}
                        leftIcon={<FiCheck />}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        leftIcon={<FiX />}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => (onEditFull ? onEditFull(r) : beginEdit(r))}
                        leftIcon={<FiEdit2 />}
                      >
                        Edit
                      </Button>
                      {onArchive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onArchive(r.id)}
                          disabled={r.archived}
                          leftIcon={<FiArchive />}
                        >
                          Archive
                        </Button>
                      ) : null}
                      {onUnarchive ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onUnarchive(r.id)}
                          disabled={!r.archived}
                          leftIcon={<FiRotateCcw />}
                        >
                          Unarchive
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteId(r.id)}
                          leftIcon={<FiTrash2 />}
                        >
                          Delete
                        </Button>
                      ) : null}
                      {onExportExcel ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onExportExcel(r)}
                          leftIcon={<FiDownload />}
                        >
                          Excel
                        </Button>
                      ) : null}
                      {onExportPdf ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onExportPdf(r)}
                          leftIcon={<FiFileText />}
                        >
                          PDF
                        </Button>
                      ) : null}
                    </div>
                  )}
                </TD>
              ) : null}
            </motion.tr>
          );
        })}
      </TBody>
    </Table>

    <Modal
      open={!!deleteId}
      onClose={() => setDeleteId(null)}
      title="Delete reason"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            leftIcon={<FiTrash2 />}
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-sm text-brand-gray-900">
        Are you sure you want to delete this reason?
      </p>
    </Modal>
    </>
  );
}
