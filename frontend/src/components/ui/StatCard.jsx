import { motion } from 'framer-motion';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { cn } from '@/utils/cn';

/**
 * KPI card: icon, label, big value, and a colored delta chip.
 */
export default function StatCard({ icon: Icon, label, value, delta, tone = 'brand', className }) {
  const toneClasses = {
    brand: 'bg-brand-500/15 text-brand-400',
    success: 'bg-productive/15 text-productive',
    warning: 'bg-neutral/15 text-neutral',
    danger: 'bg-unproductive/15 text-unproductive',
    info: 'bg-sky-500/15 text-sky-400',
    personal: 'bg-personal/15 text-personal',
  };
  const isDown = typeof delta === 'string' && delta.trim().startsWith('-');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn('card p-5', className)}
    >
      <div className="flex items-start justify-between">
        {Icon && (
          <span className={cn('grid h-11 w-11 place-items-center rounded-xl', toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
              isDown ? 'bg-unproductive/10 text-unproductive' : 'bg-productive/10 text-productive'
            )}
          >
            {isDown ? <FiTrendingDown className="h-3 w-3" /> : <FiTrendingUp className="h-3 w-3" />}
            {delta}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-sm text-ink-400">{label}</p>
    </motion.div>
  );
}
