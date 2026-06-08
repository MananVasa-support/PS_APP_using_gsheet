import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function StepIndicator({ steps, current }) {
  return (
    <ol className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-thin">
      {steps.map((label, idx) => {
        const state =
          idx < current ? 'done' : idx === current ? 'current' : 'upcoming';
        return (
          <li key={label} className="flex items-center gap-2 shrink-0">
            <motion.span
              animate={{ scale: state === 'current' ? 1.05 : 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border',
                state === 'done' &&
                  'bg-brand-black text-white border-brand-black',
                state === 'current' &&
                  'bg-brand-red text-white border-brand-red shadow-sm shadow-brand-red/20',
                state === 'upcoming' &&
                  'bg-white text-brand-gray-900 border-brand-gray-200'
              )}
            >
              <span
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                  state === 'done' && 'bg-white/15',
                  state === 'current' && 'bg-white/15',
                  state === 'upcoming' && 'bg-brand-gray-100 text-brand-gray-600'
                )}
              >
                {idx + 1}
              </span>
              {label}
            </motion.span>
            {idx < steps.length - 1 ? (
              <span className="w-6 h-px bg-brand-gray-200" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
