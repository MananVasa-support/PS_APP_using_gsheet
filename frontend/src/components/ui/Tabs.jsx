import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

/**
 * Underline-style tab bar.
 *
 * @param {{id:string,label:string,icon?:Function}[]} tabs
 */
export default function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-ink-700 no-scrollbar', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-white' : 'text-ink-400 hover:text-slate-200'
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
            {isActive && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
