import { useState } from 'react';
import { FiEdit2, FiCheck, FiSave, FiX } from 'react-icons/fi';
import clsx from 'clsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Input from '@/features/reason-eliminator/components/common/Input.jsx';
import Badge from '@/features/reason-eliminator/components/common/Badge.jsx';
import CategorySelector from './CategorySelector.jsx';
import PowerWordPicker from './PowerWordPicker.jsx';
import { CATEGORY_BY_ID, CATEGORY_DETAILS } from '../constants.js';

const DETAIL_BY_ID = Object.values(CATEGORY_DETAILS)
  .flat()
  .reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {});

// Full editor for a single reason: edit the Reason text, its Category +
// Subcategory (exactly the assessment's category section), and its Power Word
// (exactly the Power Word Exercise picker). Each field has its own "Edit"
// toggle; "Save changes" commits everything at once via onSave.
//
// Self-contained working copy — nothing is written until Save, so the caller's
// storage/logic is only touched on save.
export default function ReasonEditPanel({
  reason,
  powerWordOptions = [],
  onSave,
  onCancel,
}) {
  const [text, setText] = useState(reason.text || '');
  const [categories, setCategories] = useState(
    Array.isArray(reason.categories)
      ? reason.categories
      : reason.category
      ? [reason.category]
      : []
  );
  const [details, setDetails] = useState(
    Array.isArray(reason.details) ? reason.details : []
  );
  const [powerWord, setPowerWord] = useState(reason.powerWord || '');

  const [editText, setEditText] = useState(false);
  const [editCat, setEditCat] = useState(false);
  const [editPower, setEditPower] = useState(false);

  const toggleCategory = (cid) =>
    setCategories((cur) =>
      cur.includes(cid) ? cur.filter((c) => c !== cid) : [...cur, cid]
    );
  const toggleDetail = (did) =>
    setDetails((cur) =>
      cur.includes(did) ? cur.filter((d) => d !== did) : [...cur, did]
    );

  const categoryObjs = categories.map((id) => CATEGORY_BY_ID[id]).filter(Boolean);
  const detailObjs = details.map((id) => DETAIL_BY_ID[id]).filter(Boolean);

  const Row = ({ label, children, onEdit, editing }) => (
    <div className="py-4 border-b border-brand-gray-100 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-red mb-1.5">
            {label}
          </p>
          {children}
        </div>
        <Button
          size="sm"
          variant={editing ? 'ghost' : 'secondary'}
          leftIcon={editing ? <FiX /> : <FiEdit2 />}
          onClick={onEdit}
        >
          {editing ? 'Close' : 'Edit'}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Reason */}
      <Row
        label="Reason"
        editing={editText}
        onEdit={() => setEditText((v) => !v)}
      >
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

      {/* Category + Subcategory */}
      <Row
        label="Category"
        editing={editCat}
        onEdit={() => setEditCat((v) => !v)}
      >
        {editCat ? (
          <div className="mt-2">
            <CategorySelector value={categories} onToggle={toggleCategory} />
            <p className="mt-3 text-sm text-brand-gray-900">
              Select one or more Categories.
            </p>
            {categories.length > 0 ? (
              <div className="mt-4 space-y-4">
                {categories.map((cid) => {
                  const cat = CATEGORY_BY_ID[cid];
                  const opts = CATEGORY_DETAILS[cid] || [];
                  if (!cat || opts.length === 0) return null;
                  return (
                    <div key={cid}>
                      <p className="mb-2 text-sm font-semibold text-brand-black">
                        {cat.label}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {opts.map((o) => {
                          const checked = details.includes(o.id);
                          return (
                            <button
                              key={o.id}
                              type="button"
                              role="checkbox"
                              aria-checked={checked}
                              onClick={() => toggleDetail(o.id)}
                              className={clsx(
                                'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                                checked
                                  ? 'border-brand-red bg-brand-red-soft text-brand-black'
                                  : 'border-brand-gray-200 bg-white text-brand-ink hover:border-brand-gray-300 hover:bg-brand-gray-50'
                              )}
                            >
                              <span
                                className={clsx(
                                  'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                                  checked
                                    ? 'border-brand-red bg-brand-red text-white'
                                    : 'border-brand-gray-300'
                                )}
                              >
                                {checked ? <FiCheck size={12} /> : null}
                              </span>
                              <span>{o.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {categoryObjs.length === 0 ? (
              <span className="text-brand-gray-400 text-sm">—</span>
            ) : (
              categoryObjs.map((c) => (
                <Badge key={c.id} tone="red">
                  {c.code} · {c.label.replace('Lack of ', '')}
                </Badge>
              ))
            )}
            {detailObjs.map((d) => (
              <Badge key={d.id} tone="outline">
                {d.label}
              </Badge>
            ))}
          </div>
        )}
      </Row>

      {/* Power Word */}
      <Row
        label="Power Word"
        editing={editPower}
        onEdit={() => setEditPower((v) => !v)}
      >
        {editPower ? (
          <div className="mt-1 max-w-sm">
            <PowerWordPicker
              options={powerWordOptions}
              onPick={(w) => {
                setPowerWord(w);
                setEditPower(false);
              }}
            />
            {powerWord ? (
              <p className="mt-2 text-sm text-brand-gray-900">
                Current: <span className="font-semibold">{powerWord}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-base font-semibold text-brand-black">
            {powerWord || <span className="text-brand-gray-400">—</span>}
          </p>
        )}
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
          onClick={() => onSave?.({ text, categories, details, powerWord })}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}
