import { cn } from '@/utils/cn';

const tones = {
  default: 'bg-ink-700 text-slate-300',
  brand: 'bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30',
  success: 'bg-productive/15 text-productive ring-1 ring-productive/30',
  danger: 'bg-unproductive/15 text-unproductive ring-1 ring-unproductive/30',
  warning: 'bg-neutral/15 text-neutral ring-1 ring-neutral/30',
  personal: 'bg-personal/15 text-personal ring-1 ring-personal/30',
  info: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
};

/** Map a time-entry category to a badge tone. */
export const categoryTone = {
  Productive: 'success',
  'Non-Productive': 'danger',
  Personal: 'personal',
  Uncertain: 'warning',
};

/** Map an approval status to a badge tone. */
export const statusTone = {
  Approved: 'success',
  Pending: 'warning',
  Rejected: 'danger',
};

export default function Badge({ tone = 'default', dot = false, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
