import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FiArrowRight } from 'react-icons/fi';

export default function ActionTile({
  icon,
  title,
  description,
  onClick,
  accent = 'dark',
  disabled = false,
  comingSoon = false,
}) {
  const palette =
    accent === 'red'
      ? 'before:bg-brand-red'
      : accent === 'outline'
      ? 'before:bg-brand-gray-300'
      : 'before:bg-brand-black';

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      whileHover={!disabled ? { y: -3 } : undefined}
      whileTap={!disabled ? { scale: 0.99 } : undefined}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={clsx(
        'group relative text-left bg-white border border-brand-gray-200 rounded-2xl p-6 shadow-card transition-shadow',
        'before:absolute before:left-0 before:top-6 before:bottom-6 before:w-1 before:rounded-r-full',
        palette,
        !disabled && 'hover:shadow-card-hover hover:border-brand-gray-300',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={clsx(
            'w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors',
            accent === 'red'
              ? 'bg-brand-red-soft text-brand-red'
              : accent === 'outline'
              ? 'bg-brand-gray-100 text-brand-gray-900'
              : 'bg-brand-black text-white'
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-brand-black">{title}</h3>
            {comingSoon ? (
              <span className="text-[10px] uppercase tracking-widest font-bold text-brand-gray-900 bg-brand-gray-100 px-2 py-0.5 rounded-full">
                Soon
              </span>
            ) : null}
          </div>
          <p className="text-sm text-brand-gray-900 leading-relaxed">
            {description}
          </p>
        </div>
        {!disabled ? (
          <FiArrowRight className="text-brand-gray-400 group-hover:text-brand-red group-hover:translate-x-1 transition-all mt-2 shrink-0" />
        ) : null}
      </div>
    </motion.button>
  );
}
