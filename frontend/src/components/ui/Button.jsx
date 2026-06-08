import { cn } from '@/utils/cn';
import Spinner from './Spinner.jsx';

const variants = {
  primary: 'btn bg-brand-gradient text-white shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'btn bg-ink-700 text-slate-100 hover:bg-ink-600 border border-ink-600',
  ghost: 'btn bg-transparent text-slate-300 hover:bg-ink-800 hover:text-white',
  outline: 'btn bg-transparent text-slate-100 border border-ink-600 hover:border-brand-500 hover:text-white',
  danger: 'btn bg-brand-600 text-white hover:bg-brand-700',
  subtle: 'btn bg-brand-500/10 text-brand-400 hover:bg-brand-500/20',
};

const sizes = {
  sm: 'text-xs px-3 py-2 rounded-lg',
  md: '', // default from .btn
  lg: 'text-base px-5 py-3 rounded-2xl',
};

/**
 * Polymorphic button. Pass `as={Link}` (+ `to`) to render a router link.
 */
export default function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <Comp
      className={cn(variants[variant], sizes[size], className)}
      disabled={Comp === 'button' ? disabled || loading : undefined}
      {...props}
    >
      {loading ? <Spinner size={16} /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </Comp>
  );
}
