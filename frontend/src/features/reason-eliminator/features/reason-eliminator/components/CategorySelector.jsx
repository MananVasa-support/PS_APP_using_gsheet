import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import clsx from 'clsx';
import { CATEGORIES } from '../constants.js';

export default function CategorySelector({ value = [], onToggle }) {
  const selected = Array.isArray(value) ? value : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {CATEGORIES.map((cat) => {
        const active = selected.includes(cat.id);
        return (
          <motion.button
            key={cat.id}
            type="button"
            onClick={() => onToggle(cat.id)}
            aria-pressed={active}
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            className={clsx(
              'relative h-14 px-5 rounded-xl border font-semibold text-sm transition-colors duration-150 flex items-center justify-between gap-3',
              active
                ? 'bg-brand-black text-white border-brand-black shadow-sm'
                : 'bg-white text-brand-ink border-brand-gray-200 hover:border-brand-gray-300 hover:bg-brand-gray-50'
            )}
          >
            <span className="flex items-center gap-2.5">
              <motion.span
                initial={false}
                animate={{
                  scale: active ? 1 : 0.85,
                  backgroundColor: active ? '#E11D2A' : '#EFEFF1',
                  color: active ? '#FFFFFF' : '#52525B',
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                className="inline-flex items-center justify-center w-6 h-6 rounded-md"
              >
                {active ? <FiCheck size={14} /> : null}
              </motion.span>
              <span>{cat.label}</span>
            </span>
            <span
              className={clsx(
                'inline-flex items-center justify-center w-7 h-7 rounded-md text-sm font-bold transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'bg-brand-gray-100 text-brand-gray-600'
              )}
            >
              {cat.code}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
