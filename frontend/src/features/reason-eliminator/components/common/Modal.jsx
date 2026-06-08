import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import clsx from 'clsx';

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  hideClose = false,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[size];

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-brand-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeOnBackdrop && onClose?.()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={clsx(
              'relative w-full rounded-2xl border border-brand-gray-300 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.15)]',
              // Cap the height to the viewport and lay out as a column so a tall
              // body (e.g. all categories expanded) scrolls inside the modal
              // while the header and footer stay put.
              'max-h-[90vh] flex flex-col overflow-hidden',
              sizeClass
            )}
          >
            {!hideClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-3 right-3 p-2 rounded-lg text-brand-gray-900 hover:text-brand-ink hover:bg-brand-gray-100 transition-colors"
              >
                <FiX size={18} />
              </button>
            ) : null}
            {(title || description) && (
              <div className="px-6 pt-6 pb-2 shrink-0">
                {title ? (
                  <h3 className="text-lg font-semibold text-brand-black">{title}</h3>
                ) : null}
                {description ? (
                  <p className="mt-1 text-sm text-brand-gray-800">{description}</p>
                ) : null}
              </div>
            )}
            {/* Scrollable body — grows with content, then scrolls once the
                modal hits its max height (so the bottom is always reachable). */}
            <div className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
              {children}
            </div>
            {footer ? (
              <div className="px-6 py-4 border-t border-brand-gray-100 flex items-center justify-end gap-2 rounded-b-2xl bg-brand-gray-50/60 shrink-0">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
