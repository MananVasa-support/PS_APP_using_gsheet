import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

/**
 * Animated circular progress indicator with a value in the center.
 *
 * @param {number} value  0–100
 */
export default function ProgressRing({
  value = 0,
  size = 120,
  stroke = 10,
  color = '#f93b48',
  trackColor = '#202637',
  label,
  className,
  children,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children || (
          <div>
            <div className="text-2xl font-bold text-fg-strong">{Math.round(value)}</div>
            {label && <div className="text-xs text-ink-400">{label}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
