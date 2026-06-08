import { useState } from 'react';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';
import clsx from 'clsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Input from '@/features/reason-eliminator/components/common/Input.jsx';
import Badge from '@/features/reason-eliminator/components/common/Badge.jsx';
import { gripStatus } from '../services/gripTestService.js';

const SCORES = Array.from({ length: 6 }, (_, i) => i); // 0..5

// Editor for one Grip Test entry: the Reason text and the Grip Score, each with
// its own "Edit" toggle and a single "Save changes" — same shape as the Previous
// Assessment detail editor. Self-contained working copy; nothing is written
// until Save (via onSave).
export default function GripEntryEditPanel({ entry, onSave, onCancel }) {
  const [text, setText] = useState(entry.text || '');
  const [score, setScore] = useState(
    typeof entry.score === 'number' ? entry.score : 0
  );
  const [editText, setEditText] = useState(false);

  const Row = ({ label, children, onEdit, editing }) => (
    <div className="py-4 border-b border-brand-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-red mb-1.5">
            {label}
          </p>
          {children}
        </div>
        {onEdit ? (
          <Button
            size="sm"
            variant={editing ? 'ghost' : 'secondary'}
            leftIcon={editing ? <FiX /> : <FiEdit2 />}
            onClick={onEdit}
          >
            {editing ? 'Close' : 'Edit'}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div>
      {/* Reason */}
      <Row label="Reason" editing={editText} onEdit={() => setEditText((v) => !v)}>
        {editText ? (
          <Input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Reason text"
          />
        ) : (
          <p className="text-base font-semibold text-brand-black">
            {text || <span className="text-brand-gray-400">—</span>}
          </p>
        )}
      </Row>

      {/* Grip Score (always editable with the 0–5 buttons) */}
      <Row label="Grip Score">
        <div className="flex flex-wrap items-center gap-2">
          {SCORES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={clsx(
                'inline-flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-bold transition-colors',
                score === n
                  ? 'border-brand-red bg-brand-red text-white'
                  : 'border-brand-gray-200 bg-white text-brand-ink hover:border-brand-gray-300 hover:bg-brand-gray-50'
              )}
            >
              {n}
            </button>
          ))}
          <Badge tone="red">{gripStatus(score)}</Badge>
        </div>
      </Row>

      <div className="mt-5 flex items-center justify-end gap-2">
        {onCancel ? (
          <Button variant="ghost" leftIcon={<FiX />} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          variant="primary"
          leftIcon={<FiSave />}
          onClick={() => onSave?.({ text, score })}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
