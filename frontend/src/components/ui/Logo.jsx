import { Link } from 'react-router-dom';
import logoUrl from '@/assets/logo.png';
import { cn } from '@/utils/cn';

/**
 * Productivity Shastra logo — brand mark image in a rounded tile + wordmark.
 *
 * @param {boolean} compact  Show only the logo tile (used in the collapsed sidebar).
 * @param {number}  height   Tile height in px.
 * @param {string}  to       If set, the logo becomes a link (e.g. "/home" so the
 *                           brand always returns the user to the dashboard hub).
 */
export default function Logo({ compact = false, height = 40, className, to }) {
  const inner = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-glow"
        style={{ height, width: height }}
      >
        <img src={logoUrl} alt="Productivity Shastra logo" className="h-full w-full object-contain" />
      </span>
      {!compact && (
        <span className="font-display font-extrabold leading-none tracking-tight text-fg-strong">
          <span className="block text-base">Productivity</span>
          <span className="block text-base text-brand-500">Shastra</span>
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} aria-label="Go to dashboard" className="rounded-xl transition-opacity hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}
