import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

/**
 * Surface card with an optional title/subtitle header and right-side action.
 * Animates in on mount.
 */
export default function Card({
  title,
  subtitle,
  action,
  className,
  bodyClassName,
  children,
  hover = false,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'card p-5',
        hover && 'transition-colors hover:border-brand-500/40',
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="font-semibold text-fg-strong">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </motion.div>
  );
}
