import { useEffect, useRef, useState } from 'react';
import { FiFilter, FiChevronDown } from 'react-icons/fi';
import clsx from 'clsx';
import { DATE_PERIODS, periodLabel } from '../utils/datePeriods.js';

// Standalone "Filter By" date dropdown, used where only the dropdown is needed
// (no search input or summary). Controlled by its parent; adds no data logic of
// its own beyond a small open/close.
export default function FilterByDropdown({ period, onPeriodChange, className }) {
  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ddRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          'w-full h-11 px-4 flex items-center justify-between gap-2 rounded-xl bg-white text-sm font-semibold text-brand-black border transition-colors',
          open
            ? 'border-brand-red ring-2 ring-brand-red/15'
            : 'border-brand-gray-200 hover:border-brand-gray-300'
        )}
      >
        <span className="flex items-center gap-2 truncate">
          <FiFilter className="shrink-0 text-brand-red" />
          <span className="truncate">{periodLabel(period)}</span>
        </span>
        <FiChevronDown
          className={clsx('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl bg-white border border-brand-gray-200 shadow-modal py-1"
        >
          {DATE_PERIODS.map((opt) => {
            const active = opt.value === period;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onPeriodChange(opt.value);
                    setOpen(false);
                  }}
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
  );
}
