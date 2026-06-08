import { useEffect, useRef, useState } from 'react';
import { FiSearch, FiFilter, FiChevronDown, FiX } from 'react-icons/fi';
import clsx from 'clsx';
import { DATE_PERIODS, periodLabel } from '../utils/datePeriods.js';

// A self-contained Search + Filter bar added above the existing tables. It is
// fully controlled by its parent (the parent owns the search term, the selected
// period and the custom range), so it adds no logic of its own beyond a small
// dropdown open/close. Purely additive — it never touches existing data or UI.
export default function SearchFilterBar({
  search,
  onSearchChange,
  placeholder = 'Search...',
  period,
  onPeriodChange,
  customFrom = '',
  customTo = '',
  onCustomFromChange,
  onCustomToChange,
  totalRecords,
  resultsFound,
  showSummary = true,
  showSearch = true,
}) {
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
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input with a leading magnifier. Updates results live. */}
        {showSearch ? (
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-brand-gray-400">
              <FiSearch />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-full h-12 pl-11 pr-10 rounded-xl bg-white text-brand-ink placeholder-brand-gray-400 shadow-sm border border-brand-gray-200 transition-all duration-150 hover:border-brand-gray-300 hover:shadow focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 focus:outline-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-gray-400 hover:text-brand-red transition-colors"
              >
                <FiX />
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Filter By dropdown. When the search bar is hidden, the filter takes
            its place (left-aligned, full width); otherwise it stays a fixed-width
            control on the right next to the search input. */}
        <div
          ref={ddRef}
          className={clsx(
            'relative',
            showSearch ? 'w-full sm:w-56 shrink-0' : 'w-full flex-1'
          )}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={clsx(
              'w-full h-12 px-4 flex items-center justify-between gap-2 rounded-xl bg-white text-sm font-semibold text-brand-black border transition-colors',
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
              className={clsx(
                'shrink-0 transition-transform',
                open && 'rotate-180'
              )}
            />
          </button>

          {open ? (
            <ul
              role="listbox"
              className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl bg-white border border-brand-gray-200 shadow-modal py-1"
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
      </div>

      {/* Custom date range — only when "Custom Date Range" is selected. */}
      {period === 'custom' ? (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-brand-gray-900">
            <span className="font-medium">From</span>
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onCustomFromChange?.(e.target.value)}
              className="h-11 px-3 rounded-xl bg-white text-brand-ink border border-brand-gray-200 hover:border-brand-gray-300 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-gray-900">
            <span className="font-medium">To</span>
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onCustomToChange?.(e.target.value)}
              className="h-11 px-3 rounded-xl bg-white text-brand-ink border border-brand-gray-200 hover:border-brand-gray-300 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
            />
          </label>
        </div>
      ) : null}

      {/* Summary line. */}
      {showSummary ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-brand-gray-900">
          <span>
            Total Records:{' '}
            <span className="font-semibold text-brand-black">
              {totalRecords ?? 0}
            </span>
          </span>
          <span>
            Showing:{' '}
            <span className="font-semibold text-brand-black">
              {periodLabel(period)}
            </span>
          </span>
          <span>
            Results Found:{' '}
            <span className="font-semibold text-brand-black">
              {resultsFound ?? 0}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
