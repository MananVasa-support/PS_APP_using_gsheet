import { useState } from 'react';
import PolicyModal from '@/components/legal/PolicyModal.jsx';
import logoUrl from '@/assets/logo.png';
import { cn } from '@/utils/cn';

/**
 * Global footer — one reusable component, two page-appropriate variants:
 *
 *   variant="app"  (default) — integrated application chrome for the dashboard,
 *                  internal pages and tools: full-width bar, top border, theme
 *                  surface, aligned to the page's max-width gutters.
 *   variant="auth" — minimal, lightweight strip for the login / signup screens:
 *                  transparent, smaller, understated — fits the focused auth UI.
 *
 *   Left:  © <year> Altus Corp. All Rights Reserved.
 *   Right: "Policies" → opens the half-page PolicyModal (Privacy / Terms /
 *          Refund tabs, close button, Esc / click-outside to dismiss).
 */
export default function Footer({ variant = 'app', className }) {
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear();
  const isAuth = variant === 'auth';

  return (
    <>
      <footer
        className={cn(
          'w-full',
          isAuth ? 'bg-transparent' : 'border-t border-ink-800/80 bg-ink-950/70',
          className
        )}
      >
        <div
          className={cn(
            'mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8',
            isAuth ? 'max-w-md py-4 sm:max-w-xl' : 'max-w-7xl py-4'
          )}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="grid shrink-0 place-items-center overflow-hidden rounded-lg bg-white p-0.5 shadow-glow ring-1 ring-ink-700"
              style={{ height: isAuth ? 20 : 24, width: isAuth ? 20 : 24 }}
            >
              <img src={logoUrl} alt="Productivity Shastra logo" className="h-full w-full object-contain" />
            </span>
            <p className={cn('text-xs text-ink-500', isAuth && 'text-[11px]')}>
              © {year} <span className="font-medium text-ink-300">Altus Corp.</span> All Rights Reserved.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'rounded-md font-medium text-ink-400 transition-colors hover:text-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isAuth ? 'text-[11px]' : 'text-xs'
            )}
            aria-haspopup="dialog"
          >
            Policies
          </button>
        </div>
      </footer>

      <PolicyModal open={open} onClose={() => setOpen(false)} initialTab="privacy" />
    </>
  );
}
