import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input(
  { label, hint, error, className, id, ...rest },
  ref
) {
  const inputId = id || rest.name;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-brand-gray-900 mb-1.5"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full h-12 px-4 rounded-xl bg-white text-brand-ink placeholder-brand-gray-400 shadow-sm',
          'border border-brand-gray-200 transition-all duration-150',
          'hover:border-brand-gray-300 hover:shadow focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 focus:outline-none',
          error && 'border-brand-red focus:border-brand-red focus:ring-brand-red/20',
          className
        )}
        {...rest}
      />
      {hint && !error ? (
        <p className="mt-1.5 text-sm text-brand-gray-900">{hint}</p>
      ) : null}
      {error ? <p className="mt-1.5 text-sm text-brand-red">{error}</p> : null}
    </div>
  );
});

export default Input;
