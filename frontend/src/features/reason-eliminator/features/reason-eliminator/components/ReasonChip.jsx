import clsx from 'clsx';

export default function ReasonChip({ label, active = false, className }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold border',
        active
          ? 'bg-brand-red text-white border-brand-red shadow-sm shadow-brand-red/20'
          : 'bg-white text-brand-ink border-brand-gray-200',
        className
      )}
    >
      {label}
    </span>
  );
}
