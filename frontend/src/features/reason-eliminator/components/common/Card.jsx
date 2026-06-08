import clsx from 'clsx';
import { motion } from 'framer-motion';

export default function Card({
  as: Tag = 'div',
  className,
  interactive = false,
  children,
  ...rest
}) {
  const MotionTag = motion(Tag);

  return (
    <MotionTag
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={clsx(
        'surface-card',
        interactive && 'cursor-pointer hover:shadow-card-hover hover:border-brand-gray-300',
        className
      )}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
