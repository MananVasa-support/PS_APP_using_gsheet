import { forwardRef } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { cn } from '@/utils/cn';

/**
 * Styled native <select>. `options` is an array of strings or {value,label}.
 */
const Select = forwardRef(function Select(
  { label, options = [], error, className, id, placeholder, ...props },
  ref
) {
  const selectId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-fg-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn('input-base appearance-none pr-10', error && 'border-brand-500')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const value = typeof opt === 'string' ? opt : opt.value;
            const text = typeof opt === 'string' ? opt : opt.label;
            return (
              <option key={value} value={value} className="bg-ink-800">
                {text}
              </option>
            );
          })}
        </select>
        <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
      {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
    </div>
  );
});

export default Select;
