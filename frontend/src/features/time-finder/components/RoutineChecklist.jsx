import { useMemo, useState } from 'react';

const COLUMNS = 4;
const ROWS = 5;
const ITEMS_PER_PAGE = COLUMNS * ROWS; // 20

/**
 * Vertical-fill, multi-column routine checklist.
 *
 * Numbering runs DOWN each column before moving to the next:
 *   1  6  11  16
 *   2  7  12  17
 *   3  8  13  18
 *   4  9  14  19
 *   5  10 15  20
 *
 * @param {{ routines: string[] }} props
 */
export default function RoutineChecklist({ routines }) {
  const [startIndex, setStartIndex] = useState(0);
  // Track checked items by their global index so the state survives paging.
  const [checked, setChecked] = useState(() => new Set());

  const total = routines.length;
  const lastPageStart = Math.max(0, Math.floor((total - 1) / ITEMS_PER_PAGE) * ITEMS_PER_PAGE);

  // Items visible on the current page (up to 20).
  const paginatedItems = useMemo(
    () => routines.slice(startIndex, startIndex + ITEMS_PER_PAGE),
    [routines, startIndex]
  );

  // Split the page into 4 columns of 5 — column-wise (vertical fill).
  const columnData = useMemo(
    () =>
      Array.from({ length: COLUMNS }, (_, colIndex) =>
        paginatedItems.slice(colIndex * ROWS, colIndex * ROWS + ROWS)
      ),
    [paginatedItems]
  );

  const toggle = (globalIndex) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(globalIndex) ? next.delete(globalIndex) : next.add(globalIndex);
      return next;
    });

  const goBack = () => setStartIndex((i) => Math.max(0, i - ITEMS_PER_PAGE));
  const goNext = () => setStartIndex((i) => Math.min(lastPageStart, i + ITEMS_PER_PAGE));

  const canGoBack = startIndex > 0;
  const canGoNext = startIndex + ITEMS_PER_PAGE < total;

  const pageNumber = startIndex / ITEMS_PER_PAGE + 1;
  const pageCount = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const checkedOnPage = paginatedItems.filter((_, i) => checked.has(startIndex + i)).length;

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-card sm:p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-tfink-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-tfink-900">Routine Assessment</h2>
          <p className="text-sm text-tfink-500">
            {checked.size} of {total} completed · {checkedOnPage}/{paginatedItems.length} on this page
          </p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
          Page {pageNumber} / {pageCount}
        </span>
      </header>

      {/* Column-wise vertical layout — numbering runs top-to-bottom per column. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {columnData.map((col, colIndex) => (
          <div key={colIndex} className="space-y-2">
            {col.map((item, rowIndex) => {
              const globalIndex = startIndex + colIndex * ROWS + rowIndex;
              const isChecked = checked.has(globalIndex);
              return (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-brand-soft"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(globalIndex)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
                  />
                  <span
                    className={
                      'text-sm transition-colors ' +
                      (isChecked ? 'text-tfink-500 line-through' : 'text-tfink-900')
                    }
                  >
                    <span className="mr-1 inline-block w-6 text-right font-semibold tabular-nums text-tfink-500">
                      {globalIndex + 1}.
                    </span>
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      <footer className="mt-7 flex items-center justify-between border-t border-tfink-200 pt-5">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className="rounded-lg border border-tfink-200 bg-white px-5 py-2 text-sm font-semibold text-tfink-900 transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Back
        </button>

        <span className="text-xs text-tfink-500">
          Showing {total === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, total)} of {total}
        </span>

        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </footer>
    </section>
  );
}
