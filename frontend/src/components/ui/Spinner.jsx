import { cn } from '@/utils/cn';

/** Simple brand-colored loading spinner. */
export default function Spinner({ size = 20, className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-ink-600 border-t-brand-500',
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
