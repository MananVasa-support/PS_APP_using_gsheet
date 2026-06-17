import { useRef, useState } from 'react';
import { FiChevronDown, FiCheck, FiPlus, FiStar } from 'react-icons/fi';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/cn';

/**
 * Shared form widgets for the Personal Space / Expectations / Feedback tools.
 * All are shell-themed (ink/fg/brand CSS vars) so they follow dark & light.
 */

const labelCls = 'mb-1.5 block text-sm font-medium text-fg-muted';
const reqStar = <span className="text-brand-400">*</span>;

// ── Auto-add dropdown: pick an option or type a new one to add ───────────────
export function AutoAddSelect({ label, required, value, options, placeholder, onChange, transform, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  const query = value.trim().toLowerCase();
  const filtered = options.filter((o) => o.toLowerCase().includes(query));
  const exact = options.some((o) => o.toLowerCase() === query);
  const canAdd = query.length > 0 && !exact;

  const pick = (v) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className={labelCls}>
          {label} {required && reqStar}
        </label>
      )}
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn('input-base pr-10', error && 'border-brand-500')}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-ink-400 hover:text-fg-strong"
          aria-label="Toggle options"
        >
          <FiChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      {open && (filtered.length > 0 || canAdd) && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-ink-700 bg-ink-850 py-1 shadow-card">
          {filtered.map((o) => (
            <li key={o}>
              <button
                type="button"
                onClick={() => pick(o)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-ink-800',
                  o === value ? 'text-fg-strong' : 'text-fg-muted'
                )}
              >
                {o}
                {o === value && <FiCheck className="h-4 w-4 text-brand-400" />}
              </button>
            </li>
          ))}
          {canAdd && (
            <li>
              <button
                type="button"
                onClick={() => pick(value.trim())}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-brand-400 transition-colors hover:bg-ink-800"
              >
                <FiPlus className="h-4 w-4" /> Add “{value.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
      {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
    </div>
  );
}

// ── Single-choice button group (status pickers) ──────────────────────────────
export function StatusButtons({ label, required, options, value, onChange, error }) {
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label} {required && reqStar}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              type="button"
              key={o}
              onClick={() => onChange(o)}
              className={cn(
                'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                active
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                  : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
    </div>
  );
}

// ── Star / point rating ──────────────────────────────────────────────────────
// `max` stars; `allowZero` lets the scale start at 0 (click the active value
// again to clear back to 0). Returns the numeric score via onChange.
export function StarRating({ label, value, onChange, max = 5, allowZero = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            type="button"
            key={n}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(allowZero && value === n ? n - 1 : n)}
            className={cn('transition-transform hover:scale-110', n <= shown ? 'text-brand-400' : 'text-ink-600')}
            aria-label={`${n} of ${max}`}
          >
            <FiStar className={cn('h-6 w-6', n <= shown && 'fill-current')} />
          </button>
        ))}
        <span className="ml-2 text-sm font-semibold text-fg-muted">
          {value || 0}/{max}
        </span>
      </div>
    </div>
  );
}

// ── Numeric point scale (0…max as buttons) ──────────────────────────────────
export function PointScale({ label, required, value, onChange, min = 0, max = 5, error }) {
  const points = [];
  for (let n = min; n <= max; n += 1) points.push(n);
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label} {required && reqStar}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {points.map((n) => {
          const active = value === n;
          return (
            <button
              type="button"
              key={n}
              onClick={() => onChange(n)}
              className={cn(
                'h-10 w-10 rounded-xl border text-sm font-bold transition',
                active
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                  : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
    </div>
  );
}

// ── HH:MM masked input ───────────────────────────────────────────────────────
export function HHMMInput({ label, required, value, onChange, error }) {
  const handle = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    let out = digits;
    if (digits.length > 2) out = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    onChange(out);
  };
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label} {required && reqStar}
        </label>
      )}
      <input
        value={value}
        onChange={(e) => handle(e.target.value)}
        inputMode="numeric"
        placeholder="HH:MM"
        maxLength={5}
        className={cn('input-base', error && 'border-brand-500')}
      />
      {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
    </div>
  );
}

// ── Plain labelled text / textarea / date helpers ────────────────────────────
export function Field({ label, required, error, children }) {
  return (
    <div>
      {label && (
        <label className={labelCls}>
          {label} {required && reqStar}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
    </div>
  );
}
