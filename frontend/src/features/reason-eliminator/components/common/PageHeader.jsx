import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6 md:mb-8',
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-red mb-2">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl md:text-3xl font-bold text-brand-black tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm md:text-base text-brand-gray-900 max-w-2xl">
            {description}
          </p>
        ) : null}
      </motion.div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
