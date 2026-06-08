import clsx from 'clsx';

export default function FlowFooter({ left, right, className }) {
  return (
    <div
      className={clsx(
        'mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center justify-end gap-2">{right}</div>
    </div>
  );
}
