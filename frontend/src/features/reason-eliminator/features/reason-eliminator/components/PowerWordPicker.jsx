import { useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import Autocomplete from '@/features/reason-eliminator/components/common/Autocomplete.jsx';
import Input from '@/features/reason-eliminator/components/common/Input.jsx';

// A single Power Word picker that mirrors the Power Word Exercise exactly: an
// autocomplete with select-or-type suggestions and an "Others" row to add a
// custom word. Calls onPick(word) once a non-empty Power Word is chosen/typed.
// Self-contained (its own draft + custom-entry state), so it can be reused in a
// list — one picker per reason.
export default function PowerWordPicker({
  options = [],
  onPick,
  placeholder = 'Select or type a Power Word',
}) {
  const [draft, setDraft] = useState('');
  const [customMode, setCustomMode] = useState(false);

  const commit = (word) => {
    const w = (word ?? draft).trim();
    if (!w) return;
    onPick?.(w);
    setDraft('');
    setCustomMode(false);
  };

  if (customMode) {
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-brand-gray-900">
            Add your own Power Word
          </span>
          <button
            type="button"
            onClick={() => setCustomMode(false)}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-red hover:underline"
          >
            <FiArrowLeft size={12} /> Choose from list
          </button>
        </div>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="Type a custom Power Word"
        />
      </div>
    );
  }

  return (
    <Autocomplete
      value={draft}
      onChange={setDraft}
      onSelect={(w) => commit(w)}
      options={options}
      onSubmit={() => commit()}
      onOthers={() => setCustomMode(true)}
      othersLabel="Others"
      showAllOnFocus
      placeholder={placeholder}
    />
  );
}
