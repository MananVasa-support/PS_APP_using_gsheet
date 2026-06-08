import { cn } from '@/utils/cn';

/** 1–10 rating selector. */
export default function ScaleInput({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          const active = value === n;
          return (
            <button
              type="button"
              key={n}
              onClick={() => onChange(n)}
              className={cn(
                'h-10 w-10 rounded-lg border text-sm font-semibold transition',
                active
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                  : 'border-ink-700 bg-ink-800 text-ink-300 hover:border-brand-500/50 hover:text-white'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[11px] text-ink-500">
        <span>1 — Low</span>
        <span>10 — High</span>
      </div>
    </div>
  );
}
