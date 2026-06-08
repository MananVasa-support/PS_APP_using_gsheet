import clsx from 'clsx';

export function Table({ className, children }) {
  return (
    <div
      className={clsx(
        'surface-card overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="bg-brand-gray-50 text-brand-gray-600 uppercase tracking-wide text-sm">
      {children}
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-brand-gray-100">{children}</tbody>;
}

export function TR({ className, children, ...rest }) {
  return (
    <tr
      className={clsx('transition-colors hover:bg-brand-gray-50/70', className)}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function TH({ className, children, align = 'left' }) {
  return (
    <th
      scope="col"
      className={clsx(
        'px-5 py-3 font-semibold whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TD({ className, children, align = 'left' }) {
  return (
    <td
      className={clsx(
        'px-5 py-4 text-brand-ink align-middle',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  );
}
