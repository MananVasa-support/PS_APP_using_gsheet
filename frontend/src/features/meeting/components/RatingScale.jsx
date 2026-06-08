import React from 'react';
import clsx from 'clsx';

// Reusable 0–5 rating selector (button group).
// Props: label, value (number|null), onChange(n). Optional `number` prefix.
export default function RatingScale({ number, label, helper, value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-mkink leading-snug">
          {number != null && <span className="text-brand-red font-bold">{number}. </span>}
          {label}
        </p>
        {helper && <p className="text-xs text-muted leading-snug">{helper}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 6 }, (_, n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} out of 5`}
              aria-pressed={selected}
              onClick={() => onChange(n)}
              className={clsx(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-lg border text-sm font-bold transition-all select-none',
                selected
                  ? 'bg-brand-red border-brand-red text-white shadow-red scale-105'
                  : 'bg-surface border-line text-muted hover:border-brand-red/50 hover:text-brand-red'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-soft px-0.5">
        <span>0 · Lowest</span>
        <span>Highest · 5</span>
      </div>
    </div>
  );
}
