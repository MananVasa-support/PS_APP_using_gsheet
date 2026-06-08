import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const VARIANTS = {
  primary:
    'bg-brand-red text-white hover:bg-brand-red-dark shadow-sm shadow-brand-red/25 hover:shadow-md hover:shadow-brand-red/30 disabled:bg-brand-gray-300 disabled:shadow-none',
  dark: 'bg-brand-black text-white hover:bg-brand-ink shadow-control hover:shadow-control-hover disabled:bg-brand-gray-300 disabled:shadow-none',
  secondary:
    'bg-white text-brand-ink border border-brand-gray-200 shadow-sm hover:border-brand-gray-300 hover:bg-brand-gray-50 hover:shadow disabled:text-brand-gray-400 disabled:shadow-none',
  ghost:
    'bg-transparent text-brand-gray-900 hover:bg-brand-gray-100 disabled:text-brand-gray-300',
  danger:
    'bg-white text-brand-red border border-brand-red/30 shadow-sm hover:bg-brand-red-soft hover:shadow disabled:text-brand-gray-300 disabled:border-brand-gray-200 disabled:shadow-none',
};

const SIZES = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-2xl gap-2',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    leftIcon,
    rightIcon,
    className,
    children,
    fullWidth = false,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={clsx(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none',
        'disabled:cursor-not-allowed disabled:hover:translate-y-0',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {leftIcon ? <span className="text-[1.05em] -ml-0.5">{leftIcon}</span> : null}
      <span>{children}</span>
      {rightIcon ? <span className="text-[1.05em] -mr-0.5">{rightIcon}</span> : null}
    </motion.button>
  );
});

export default Button;
