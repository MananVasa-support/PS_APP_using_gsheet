import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiShield } from 'react-icons/fi';
import { POLICIES, POLICY_CONTACT } from '@/data/policies';
import { cn } from '@/utils/cn';

/**
 * Half-page legal reader — opens from the global footer. Three tabs
 * (Privacy / Terms / Refund), a close button, and a scrollable body. Slides up
 * from the bottom like a sheet, with a dimmed backdrop (same family as the old
 * Power-Word chart popup the user referenced).
 */

// One content block → JSX.
function Block({ block }) {
  if (typeof block === 'string') {
    return <p className="mb-3 text-sm leading-relaxed text-ink-300">{block}</p>;
  }
  if (block.ul) {
    return (
      <ul className="mb-3 space-y-1.5 pl-1">
        {block.ul.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.note) {
    return (
      <div className="mb-3 rounded-xl border-l-2 border-brand-500 bg-brand-500/10 px-4 py-3 text-sm leading-relaxed text-fg">
        {block.note}
      </div>
    );
  }
  return null;
}

function PolicyBody({ policy }) {
  return (
    <div>
      {/* Hero strip */}
      <div className="mb-6 rounded-2xl bg-brand-gradient px-5 py-5 text-white shadow-glow">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Legal &amp; Compliance</p>
        <h3 className="mt-1 font-display text-2xl font-bold">{policy.title}</h3>
        <p className="mt-1 text-xs text-white/70">{policy.meta}</p>
      </div>

      {policy.intro && (
        <div className="mb-6 rounded-xl border border-ink-700 bg-ink-900/50 px-4 py-3 text-sm leading-relaxed text-fg-muted">
          {policy.intro}
        </div>
      )}

      {policy.sections.map((s) => (
        <section key={s.n} className="mb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">{s.n}</p>
          <h4 className="mb-3 mt-1 border-b border-ink-800 pb-2 font-display text-lg font-bold text-fg-strong">
            {s.h}
          </h4>
          {s.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}

      {/* Shared contact card */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-5">
        <h4 className="font-display text-lg font-bold text-fg-strong">{POLICY_CONTACT.org}</h4>
        <p className="mt-1 text-xs text-ink-400">{POLICY_CONTACT.line}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['Address', POLICY_CONTACT.address],
            ['Websites', POLICY_CONTACT.websites],
            ['Email', POLICY_CONTACT.email],
            ['Phone', POLICY_CONTACT.phone],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-500">{label}</p>
              <p className="text-sm text-fg-muted">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PolicyModal({ open, onClose, initialTab = 'privacy' }) {
  const [tab, setTab] = useState(initialTab);

  // Open at whichever policy the user clicked; reset scroll on tab change.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const active = POLICIES.find((p) => p.id === tab) || POLICIES[0];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Legal policies"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            className="always-dark relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-700 bg-ink-950 shadow-2xl sm:h-[82vh] sm:max-w-3xl sm:rounded-3xl"
          >
            {/* Header: icon + title + tabs + close */}
            <div className="shrink-0 border-b border-ink-800 bg-ink-950/95 px-5 pt-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                  <FiShield className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg-strong">Policies</p>
                  <p className="truncate text-xs text-ink-500">Altus Corporation · Productivity Shastra</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-fg-strong"
                  aria-label="Close"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex gap-1">
                {POLICIES.map((p) => {
                  const isActive = p.id === tab;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setTab(p.id)}
                      className={cn(
                        'relative px-4 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'text-fg-strong' : 'text-ink-400 hover:text-fg'
                      )}
                    >
                      {p.label}
                      {isActive && (
                        <motion.span
                          layoutId="policy-tab-underline"
                          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable body — re-keyed per tab so it scrolls back to top */}
            <div key={tab} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <PolicyBody policy={active} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
