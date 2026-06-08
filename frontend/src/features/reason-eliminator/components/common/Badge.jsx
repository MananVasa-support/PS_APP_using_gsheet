import clsx from 'clsx';

const TONES = {
  neutral: 'bg-brand-gray-100 text-brand-gray-900 border-brand-gray-200',
  red: 'bg-brand-red-soft text-brand-red border-brand-red/20',
  dark: 'bg-brand-black text-white border-transparent',
  outline: 'bg-white text-brand-gray-900 border-brand-gray-200',
};

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-semibold tracking-wide',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
