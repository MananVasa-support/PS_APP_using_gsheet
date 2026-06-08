import { initials } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * Avatar that shows the image when available, otherwise colored initials.
 */
export default function Avatar({ name = '', src, size = 40, className, ring = false }) {
  return (
    <span
      className={cn(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient font-semibold text-white',
        ring && 'ring-2 ring-brand-500/40 ring-offset-2 ring-offset-ink-900',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name) || '?'
      )}
    </span>
  );
}
