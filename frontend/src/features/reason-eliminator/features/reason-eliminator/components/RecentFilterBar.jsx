import clsx from 'clsx';
import { RECENT_FILTERS } from '../utils/recentFilter.js';

// A button-row filter: Latest · Last 3 · Last 5 · Last 10 · All · From – To.
// Fully controlled by its parent (the parent owns the selected value and the
// custom date bounds), so it adds no logic of its own. Purely presentational —
// it never touches existing data or handlers.
export default function RecentFilterBar({
  value,
  onChange,
  customFrom = '',
  customTo = '',
  onCustomFromChange,
  onCustomToChange,
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {RECENT_FILTERS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              className={clsx(
                'h-10 px-4 rounded-xl text-sm font-semibold border transition-colors',
                active
                  ? 'border-brand-red bg-brand-red text-white'
                  : 'border-brand-gray-200 bg-white text-brand-black hover:border-brand-gray-300'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom date range — only when "From – To" is selected. */}
      {value === 'custom' ? (
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
    </div>
  );
}
