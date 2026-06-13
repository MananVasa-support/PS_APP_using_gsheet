import { useState } from 'react';
import PolicyModal from '@/components/legal/PolicyModal.jsx';
import { POLICIES } from '@/data/policies';
import { cn } from '@/utils/cn';

/**
 * Global footer — rendered in every layout.
 *   left  : © <year> Altus Corp · All rights reserved
 *   right : Privacy · Terms · Refund  → each opens the half-page PolicyModal
 *           at that tab (with a close button + the other two tabs).
 *
 * `variant`:
 *   'app'  — full-width bar under the dashboard / tools / profile chrome.
 *   'auth' — slimmer, transparent strip for the login / signup screens.
 */
export default function Footer({ variant = 'app', className }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('privacy');
  const year = new Date().getFullYear();

  const openAt = (id) => {
    setTab(id);
    setOpen(true);
  };

  const isAuth = variant === 'auth';

  return (
    <>
      <footer
        className={cn(
          'w-full',
          isAuth ? 'bg-transparent' : 'border-t border-ink-800/80 bg-ink-950/60',
          className
        )}
      >
        <div
          className={cn(
            'mx-auto flex flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8',
            isAuth ? 'max-w-md py-5 sm:max-w-none' : 'max-w-7xl py-4'
          )}
        >
          <p className="text-xs text-ink-500">
            © {year} <span className="font-medium text-ink-300">Altus Corp</span> · All rights reserved
          </p>

          <nav className="flex items-center gap-1 text-xs" aria-label="Legal policies">
            {POLICIES.map((p, i) => (
              <span key={p.id} className="flex items-center">
                {i > 0 && <span className="px-1.5 text-ink-700">·</span>}
                <button
                  type="button"
                  onClick={() => openAt(p.id)}
                  className="font-medium text-ink-400 transition-colors hover:text-brand-400"
                >
                  {p.label === 'Privacy'
                    ? 'Privacy Policy'
                    : p.label === 'Terms'
                    ? 'Terms & Conditions'
                    : 'Refund Policy'}
                </button>
              </span>
            ))}
          </nav>
        </div>
      </footer>

      <PolicyModal open={open} onClose={() => setOpen(false)} initialTab={tab} />
    </>
  );
}
