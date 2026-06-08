import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ROUTINES = [
  'Sleep Routines',
  'Snoozing alarm',
  'Drinking water',
  'Sunlight exposure',
  'Brushing teeth',
  'Bath / shower',
  'Skin care',
  'Hair grooming',
  'Breakfast',
  'Dressing',
  'Lunch',
  'Dinner',
  'Night wind-down',
  'Haircut',
  'Cutting nails',
  'Shaving',
  'Facial',
  'Hair oil routine',
  'Morning prayer',
  'Evening prayer',
  'Visiting temple',
  'Meditation',
  'Morning walk',
  'Gym workout',
  'Yoga',
  'Stretching',
  'Evening walk',
  'Sports',
  'Running',
  'Sunday nap',
  'Organizing household',
  'WhatsApp',
  'Facebook',
  'Instagram',
  'Reel making',
  'Netflix',
  'YouTube',
  'Online shopping',
  'Time with parents',
  'Time with spouse',
  'Time with siblings',
  'Friends',
  'Relatives',
  'Family outing',
  'Guitar',
  'Flute',
  'Music listening',
  'TV',
  'Movies',
  'Reading',
  'Learning dance',
  'Learning instrument',
  'Travelling',
  'Car servicing',
  'Car insurance',
  'Utility bills',
  'GST/Income tax',
  'Statutory returns',
  'Tax audit',
  'Payment recovery',
  'Emails',
  'Cleaning mailbox',
  'Calls (events)',
  'Backup routine',
  'Organizing files',
  'Deleting files',
  'Paper piles',
  'Office drawers',
  'Home drawers',
  'Wardrobe',
  'Training programs',
  'Course assignments',
  'Listening complaints',
  'Resolving complaints',
  'Gossip',
  'Doing nothing',
  'Cribbing',
];

const ITEMS_PER_PAGE = 5;
const TOTAL_PAGES = Math.ceil(ROUTINES.length / ITEMS_PER_PAGE);

export default function AssessmentPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0); // 0-indexed
  const [selected, setSelected] = useState(() => new Set());

  const start = page * ITEMS_PER_PAGE;
  const pageItems = ROUTINES.slice(start, start + ITEMS_PER_PAGE);

  const toggle = (name) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="flex w-full max-w-xl flex-col">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black">TIME FINDER ©</h1>
          <p className="mt-1 text-sm text-gray-500">Routine Assessment</p>
        </header>

        {/* Card */}
        <div className="mt-8 flex flex-col rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {/* Section */}
          <div className="mb-5 border-b border-gray-200 pb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-red-500">Column 3</h2>
            <p className="text-lg font-semibold text-black">Routine</p>
          </div>

          {/* Routine checkbox list */}
          <ul className="flex flex-col gap-3">
            {pageItems.map((name) => {
              const checked = selected.has(name);
              return (
                <li key={name}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(name)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-red-500"
                    />
                    <span className={checked ? 'text-black' : 'text-gray-700'}>{name}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">
              Page {page + 1} of {TOTAL_PAGES}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(TOTAL_PAGES - 1, p + 1))}
              disabled={page === TOTAL_PAGES - 1}
              className="rounded-xl bg-red-500 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {/* Back home */}
        <button
          type="button"
          onClick={() => navigate('/time-finder/')}
          className="mx-auto mt-6 text-sm font-medium text-gray-500 hover:text-red-500"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
