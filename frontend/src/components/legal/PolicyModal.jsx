import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiShield } from 'react-icons/fi';
import { POLICIES, POLICY_CONTACT } from '@/data/policies';
import { cn } from '@/utils/cn';

/**
 * Legal policy reader — opened from the global footer's "Policies" link.
 *
 * A light "document reader" surface (white content, dark text) that mirrors the
 * source policy documents and stays readable regardless of the app theme, with
 * three tabs (Privacy / Terms / Refund).
 *
 * IMPORTANT — why there is exactly ONE AnimatePresence here:
 *   An earlier version nested a second `AnimatePresence mode="wait"` for the tab
 *   transition INSIDE the overlay's AnimatePresence. Framer Motion makes a
 *   parent's exit wait for every descendant's exit to finish; once a tab had
 *   been switched, the inner presence was mid-transition and the OUTER overlay's
 *   exit never completed — so the `fixed inset-0` backdrop stayed mounted and
 *   silently blocked every click after closing. The tab content now animates
 *   with a keyed mount-in only (no inner AnimatePresence), so the overlay always
 *   unmounts cleanly and the app is fully interactive the instant it closes.
 *
 * Production hardening:
 *   - rendered in a PORTAL to <body> so the fixed overlay is viewport-anchored
 *     even when opened from a transformed (framer-motion) tool subtree.
 *   - full a11y: role=dialog/tablist/tab/tabpanel, Escape + click-outside close,
 *     arrow-key tab navigation, focus moved into the dialog and restored to the
 *     trigger on close, body scroll lock (always restored on close/unmount).
 */

function Block({ block }) {
  if (typeof block === 'string') {
    return <p className="mb-3 text-sm leading-relaxed text-gray-700">{block}</p>;
  }
  if (block.ul) {
    return (
      <ul className="mb-3 space-y-1.5 pl-1">
        {block.ul.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.note) {
    return (
      <div className="mb-3 rounded-xl border-l-4 border-brand-500 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Legal &amp; Compliance</p>
        <h3 className="mt-1 font-display text-2xl font-bold text-white">{policy.title}</h3>
        <p className="mt-1 text-xs text-white/75">{policy.meta}</p>
      </div>

      {policy.intro && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
          {policy.intro}
        </div>
      )}

      {policy.sections.map((s) => (
        <section key={s.n} className="mb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">{s.n}</p>
          <h4 className="mb-3 mt-1 border-b border-gray-200 pb-2 font-display text-lg font-bold text-gray-900">
            {s.h}
          </h4>
          {s.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}

      <div className="rounded-2xl bg-gray-900 p-5 text-white">
        <h4 className="font-display text-lg font-bold text-white">{POLICY_CONTACT.org}</h4>
        <p className="mt-1 text-xs text-gray-400">{POLICY_CONTACT.line}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ['Address', POLICY_CONTACT.address],
            ['Websites', POLICY_CONTACT.websites],
            ['Email', POLICY_CONTACT.email],
            ['Phone', POLICY_CONTACT.phone],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">{label}</p>
              <p className="text-sm text-gray-200">{val}</p>
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
  const triggerRef = useRef(null); // element focused before opening, restored on close

  // Open at whichever tab the user clicked.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  // On every tab change, reset the scroll container to the top (the scroll box
  // itself doesn't remount, only its content does).
  useEffect(() => {
    if (open) bodyRef.current?.scrollTo({ top: 0 });
  }, [tab, open]);

  // Lock body scroll + manage focus while open. Cleanup ALWAYS restores both,
  // whether the modal closes via state or the component unmounts.
  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
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
  const active = POLICIES[tabIndex] || POLICIES[0];

  const onTabKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      setTab(POLICIES[(tabIndex + dir + POLICIES.length) % POLICIES.length].id);
    },
    [tabIndex]
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
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
              'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white text-gray-800 shadow-2xl outline-none',
              'sm:max-h-[84vh] sm:rounded-3xl',
              'sm:w-[92vw] lg:w-[56vw] lg:min-w-[640px] lg:max-w-[64rem]'
            )}
          >
            {/* Header: brand + tabs + close (white, sticky) */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-5 pt-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
                  <FiShield className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Policies</p>
                  <p className="truncate text-xs text-gray-500">Altus Corporation · Productivity Shastra</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
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
                        isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
                      )}
                    >
                      {p.label}
                      {/* Static underline — NOT a framer `layoutId` element. A
                          layoutId here registered the underline in Framer's
                          shared-layout projection system, which activates on tab
                          switch and then never releases during the overlay's
                          AnimatePresence exit — leaving the fixed overlay mounted
                          and blocking all input after closing. A plain span has
                          no projection record, so the overlay always unmounts. */}
                      {isActive && (
                        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable body — content remounts per tab and animates in (no
                nested AnimatePresence, so the overlay always unmounts cleanly). */}
            <div
              ref={bodyRef}
              id="policy-panel"
              role="tabpanel"
              aria-labelledby={`policy-tab-${active.id}`}
              className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-6"
            >
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <PolicyBody policy={active} />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
