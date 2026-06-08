import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx(
        'surface-card flex flex-col items-center justify-center text-center py-14 px-6',
        className
      )}
    >
      {icon ? (
        <div className="w-12 h-12 rounded-2xl bg-brand-red-soft text-brand-red flex items-center justify-center mb-4">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-brand-black">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-brand-gray-900 max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </motion.div>
  );
}
