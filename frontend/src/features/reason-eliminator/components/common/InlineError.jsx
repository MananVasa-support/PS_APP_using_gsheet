import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertCircle } from 'react-icons/fi';

/**
 * Subtle, animated inline validation message. Accessible: announces politely
 * via role="alert". Renders nothing when `message` is falsy.
 */
export default function InlineError({ message, className }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key={message}
          role="alert"
          initial={{ opacity: 0, height: 0, y: -2 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -2 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={
            'mt-1.5 flex items-center gap-1.5 overflow-hidden text-sm text-brand-red ' +
            (className || '')
          }
        >
          <FiAlertCircle size={13} className="shrink-0" />
          <span>{message}</span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
