import {
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiLock,
} from "react-icons/fi";

// One-week-at-a-time navigator.
//   Left  : the month (or "Jun – Jul" when the week crosses a boundary).
//   Right : ‹  Mon 1 Jun – Sun 7 Jun  ›  plus a "This week" shortcut and, for
//           editable weeks, a pencil that opens the date/length setup interface.
// `canPrev` / `canNext` are decided by the caller so the same control enforces
// the Plan rule (no stepping into the past) and the Review rule (no stepping
// into the future).
const WeekNavigator = ({
  monthLabel,
  rangeLabel,
  onPrev,
  onNext,
  canPrev,
  canNext,
  isCurrentWeek,
  onJumpToCurrent,
  isPast,
  isFuture,
  canEditDates = false,
  onEditDates,
}) => {
  const arrowBase =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-base transition";
  const arrowOn =
    "border-black bg-white text-black hover:bg-black hover:text-white";
  const arrowOff = "border-zinc-300 bg-zinc-100 text-zinc-300 cursor-not-allowed";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-black">
          {monthLabel}
        </p>
        {isPast ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-black bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            <FiLock className="text-[11px]" />
            Past · read-only
          </span>
        ) : isCurrentWeek ? (
          <span className="rounded-md border border-red-600 bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            This Week
          </span>
        ) : isFuture ? (
          <span className="rounded-md border border-black bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
            Upcoming
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {!isCurrentWeek ? (
          <button
            type="button"
            onClick={onJumpToCurrent}
            className="rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black hover:text-white"
          >
            This Week
          </button>
        ) : null}
        <button
          type="button"
          onClick={canPrev ? onPrev : undefined}
          disabled={!canPrev}
          aria-label="Previous week"
          className={`${arrowBase} ${canPrev ? arrowOn : arrowOff}`}
        >
          <FiChevronLeft />
        </button>
        <span className="min-w-[140px] rounded-lg border border-red-600 bg-red-600 px-3 py-1.5 text-center text-xs font-semibold text-white">
          {rangeLabel}
        </span>
        <button
          type="button"
          onClick={canNext ? onNext : undefined}
          disabled={!canNext}
          aria-label="Next week"
          className={`${arrowBase} ${canNext ? arrowOn : arrowOff}`}
        >
          <FiChevronRight />
        </button>
        {canEditDates ? (
          <button
            type="button"
            onClick={onEditDates}
            aria-label="Edit this week's dates"
            title="Edit this week's dates / length"
            className={`${arrowBase} ${arrowOn}`}
          >
            <FiEdit2 className="text-sm" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default WeekNavigator;
