import logoUrl from '@/assets/logo.png';
import { cn } from '@/utils/cn';

/**
 * Productivity Shastra logo — brand mark image in a rounded tile + wordmark.
 *
 * @param {boolean} compact  Show only the logo tile (used in the collapsed sidebar).
 * @param {number}  height   Tile height in px.
 */
export default function Logo({ compact = false, height = 40, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-glow"
        style={{ height, width: height }}
      >
        <img src={logoUrl} alt="Productivity Shastra logo" className="h-full w-full object-contain" />
      </span>
      {!compact && (
        <span className="font-display font-extrabold leading-none tracking-tight text-white">
          <span className="block text-base">Productivity</span>
          <span className="block text-base text-brand-500">Shastra</span>
        </span>
      )}
    </div>
  );
}
