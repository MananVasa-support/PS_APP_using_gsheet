import { forwardRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { cn } from '@/utils/cn';

/**
 * Labelled text input with optional leading icon, error text, and a built-in
 * show/hide toggle for password fields.
 */
const Input = forwardRef(function Input(
  { label, icon: Icon, error, hint, type = 'text', className, id, ...props },
  ref
) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;
  const inputId = id || props.name;
  const readOnly = props.readOnly;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg-muted">
          {label}
          {props.required && <span className="ml-0.5 text-brand-400">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        )}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          className={cn(
            'input-base',
            Icon && 'pl-10',
            isPassword && 'pr-10',
            readOnly && 'cursor-default bg-ink-850 text-ink-300 focus:border-ink-700 focus:ring-0',
            error && 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30'
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-fg"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-brand-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
