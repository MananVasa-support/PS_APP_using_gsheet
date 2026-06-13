import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiShield } from 'react-icons/fi';
import { POLICIES, POLICY_CONTACT } from '@/data/policies';
import { cn } from '@/utils/cn';

/**
 * Legal policy reader — opened from the global footer's "Policies" link.
 *
 * Design-system native: same backdrop + spring family as components/ui/Modal,
 * sized to ~56% of the viewport on desktop (full-width sheet feel on mobile),
 * with three tabs (Privacy / Terms / Refund), animated tab transitions, and a
 * shared contact card.
 *
 * Production hardening:
 *  - rendered in a PORTAL to <body>, so the fixed overlay is always relative to
 *    the viewport even when opened from a transformed (framer-motion) subtree
 *    like a tool page — never clipped or mis-positioned.
 *  - full a11y: role=dialog/tablist/tab/tabpanel, labelled tabs, Escape to
 *    close, click-outside to close, arrow-key tab navigation, focus moved into
 *    the dialog on open and restored to the trigger on close, body scroll lock.
 */

function Block({ block }) {
  if (typeof block === 'string') {
    return <p className="mb-3 text-sm leading-relaxed text-ink-300">{block}</p>;
  }
  if (block.ul) {
    return (
      <ul className="mb-3 space-y-1.5 pl-1">
        {block.ul.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-300">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
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
      <div className="mb-6 overflow-hidden rounded-2xl bg-brand-gradient px-5 py-5 text-white shadow-glow">
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
          <h4 className="mb-3 mt-1 border-b border-ink-800 pb-2 font-display text-lg font-bold text-fg-strong">{s.h}</h4>
          {s.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}

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
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const triggerRef = useRef(null); // element focused before opening, to restore on close

  // Sync to the tab the user clicked whenever the modal (re)opens.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // Lock body scroll, remember + restore focus, focus the dialog on open.
  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(id);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const tabIndex = POLICIES.findIndex((p) => p.id === tab);

  // Arrow-key navigation across the tablist.
  const onTabKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (tabIndex + dir + POLICIES.length) % POLICIES.length;
      setTab(POLICIES[next].id);
    },
    [tabIndex]
  );

  const active = POLICIES[tabIndex] || POLICIES[0];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Legal policies"
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'always-dark relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-ink-700 bg-ink-950 shadow-2xl outline-none',
              'sm:max-h-[84vh] sm:rounded-3xl',
              // ~56% of the viewport on desktop, comfortably bounded.
              'sm:w-[92vw] lg:w-[56vw] lg:min-w-[640px] lg:max-w-[64rem]'
            )}
          >
            {/* Header: brand + tabs + close */}
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
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-fg-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  aria-label="Close policies"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              <div role="tablist" aria-label="Policy documents" className="mt-3 flex gap-1">
                {POLICIES.map((p) => {
                  const isActive = p.id === tab;
                  return (
                    <button
                      key={p.id}
                      role="tab"
                      id={`policy-tab-${p.id}`}
                      aria-selected={isActive}
                      aria-controls="policy-panel"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setTab(p.id)}
                      onKeyDown={onTabKeyDown}
                      className={cn(
                        'relative rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                        isActive ? 'text-fg-strong' : 'text-ink-400 hover:text-fg'
                      )}
                    >
                      {p.label}
                      {isActive && (
                        <motion.span
                          layoutId="policy-tab-underline"
                          className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable body — tab switch fades + slides, scroll resets to top */}
            <div
              ref={bodyRef}
              id="policy-panel"
              role="tabpanel"
              aria-labelledby={`policy-tab-${active.id}`}
              className="min-h-0 flex-1 overflow-y-auto px-5 py-6"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <PolicyBody policy={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
