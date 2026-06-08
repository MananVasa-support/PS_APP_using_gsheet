import { cn } from '@/utils/cn';

/** Accessible on/off switch. */
export default function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cn('flex items-center justify-between gap-4', disabled && 'opacity-50')}>
      {(label || description) && (
        <span>
          {label && <span className="block text-sm font-medium text-slate-200">{label}</span>}
          {description && <span className="block text-xs text-ink-400">{description}</span>}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-gradient' : 'bg-ink-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}
