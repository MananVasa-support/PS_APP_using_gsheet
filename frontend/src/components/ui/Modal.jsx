import { AnimatePresence, motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { cn } from '@/utils/cn';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/**
 * Centered modal dialog with backdrop + spring enter/exit animation.
 * Scrolls internally on small screens. `size`: sm | md | lg | xl.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = 'brand',
  size = 'md',
  children,
  footer,
  className,
}) {
  const toneClasses = {
    brand: 'bg-brand-500/15 text-brand-400',
    danger: 'bg-unproductive/15 text-unproductive',
    success: 'bg-productive/15 text-productive',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn('relative max-h-[90vh] w-full overflow-y-auto card p-6', sizes[size], className)}
          >
            <div className="mb-4 flex items-center gap-3">
              {Icon && (
                <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', toneClasses[tone])}>
                  <Icon className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
                {subtitle && <p className="text-sm text-ink-400">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close">
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="text-slate-200">{children}</div>

            {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
