import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const ITEMS_PER_PAGE = 6; // show only 6 routine cards at a time

const CATEGORIES = [
  'All',
  'Personal Care',
  'Daily',
  'Spiritual',
  'Fitness',
  'Social',
  'Work',
  'Entertainment',
  'Waste',
];

const RECURRENCE_OPTIONS = [
  'Daily',
  'Weekly',
  '10 Days',
  '15 Days',
  'Monthly',
  'Quarterly',
  'Annually',
];

// Sub-options shown below Recurrence, depending on the selected recurrence.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];
const ANNUAL = ['Once per year'];

const SUB_OPTIONS = {
  Weekly: { label: 'Select Days', items: DAYS },
  Monthly: { label: 'Select Months', items: MONTHS },
  Quarterly: { label: 'Select Quarters', items: QUARTERS },
  Annually: { label: 'Frequency', items: ANNUAL },
};

// Routines as { name, category } objects.
const INITIAL_ROUTINES = [
  { name: 'Sleep Routines', category: 'Daily' },
  { name: 'Snoozing alarm', category: 'Daily' },
  { name: 'Drinking water', category: 'Daily' },
  { name: 'Sunlight exposure', category: 'Daily' },
  { name: 'Brushing teeth', category: 'Daily' },
  { name: 'Bath / shower', category: 'Personal Care' },
  { name: 'Skin care', category: 'Personal Care' },
  { name: 'Hair grooming', category: 'Personal Care' },
  { name: 'Breakfast', category: 'Daily' },
  { name: 'Dressing', category: 'Daily' },
  { name: 'Lunch', category: 'Daily' },
  { name: 'Dinner', category: 'Daily' },
  { name: 'Night wind-down', category: 'Daily' },
  { name: 'Haircut', category: 'Personal Care' },
  { name: 'Cutting nails', category: 'Personal Care' },
  { name: 'Shaving', category: 'Personal Care' },
  { name: 'Facial', category: 'Personal Care' },
  { name: 'Hair oil routine', category: 'Personal Care' },
  { name: 'Morning prayer', category: 'Spiritual' },
  { name: 'Evening prayer', category: 'Spiritual' },
  { name: 'Visiting temple', category: 'Spiritual' },
  { name: 'Meditation', category: 'Spiritual' },
  { name: 'Morning walk', category: 'Fitness' },
  { name: 'Gym workout', category: 'Fitness' },
  { name: 'Yoga', category: 'Fitness' },
  { name: 'Stretching', category: 'Fitness' },
  { name: 'Evening walk', category: 'Fitness' },
  { name: 'Sports', category: 'Fitness' },
  { name: 'Running', category: 'Fitness' },
  { name: 'Sunday nap', category: 'Fitness' },
  { name: 'Organizing household', category: 'Work' },
  { name: 'WhatsApp', category: 'Waste' },
  { name: 'Facebook', category: 'Waste' },
  { name: 'Instagram', category: 'Waste' },
  { name: 'Reel making', category: 'Waste' },
  { name: 'Netflix', category: 'Entertainment' },
  { name: 'YouTube', category: 'Entertainment' },
  { name: 'Online shopping', category: 'Waste' },
  { name: 'Time with parents', category: 'Social' },
  { name: 'Time with spouse', category: 'Social' },
  { name: 'Time with siblings', category: 'Social' },
  { name: 'Friends', category: 'Social' },
  { name: 'Relatives', category: 'Social' },
  { name: 'Family outing', category: 'Social' },
  { name: 'Guitar', category: 'Entertainment' },
  { name: 'Flute', category: 'Entertainment' },
  { name: 'Music listening', category: 'Entertainment' },
  { name: 'TV', category: 'Entertainment' },
  { name: 'Movies', category: 'Entertainment' },
  { name: 'Reading', category: 'Entertainment' },
  { name: 'Learning dance', category: 'Entertainment' },
  { name: 'Learning instrument', category: 'Entertainment' },
  { name: 'Travelling', category: 'Entertainment' },
  { name: 'Car servicing', category: 'Work' },
  { name: 'Car insurance', category: 'Work' },
  { name: 'Utility bills', category: 'Work' },
  { name: 'GST/Income tax', category: 'Work' },
  { name: 'Statutory returns', category: 'Work' },
  { name: 'Tax audit', category: 'Work' },
  { name: 'Payment recovery', category: 'Work' },
  { name: 'Emails', category: 'Work' },
  { name: 'Cleaning mailbox', category: 'Work' },
  { name: 'Calls (events)', category: 'Work' },
  { name: 'Backup routine', category: 'Work' },
  { name: 'Organizing files', category: 'Work' },
  { name: 'Deleting files', category: 'Work' },
  { name: 'Paper piles', category: 'Work' },
  { name: 'Office drawers', category: 'Work' },
  { name: 'Home drawers', category: 'Work' },
  { name: 'Wardrobe', category: 'Work' },
  { name: 'Training programs', category: 'Work' },
  { name: 'Course assignments', category: 'Work' },
  { name: 'Listening complaints', category: 'Work' },
  { name: 'Resolving complaints', category: 'Work' },
  { name: 'Gossip', category: 'Waste' },
  { name: 'Doing nothing', category: 'Waste' },
  { name: 'Cribbing', category: 'Waste' },
];

export default function SelectRoutines() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState(INITIAL_ROUTINES);
  const [categories, setCategories] = useState(CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [selectedRoutines, setSelectedRoutines] = useState([]); // array of names
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed
  const [customRoutine, setCustomRoutine] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState(false);

  // Filter by category, hide already-selected routines, then paginate.
  const filtered = useMemo(() => {
    const byCategory =
      selectedCategory === 'All'
        ? routines
        : routines.filter((r) => r.category === selectedCategory);
    return byCategory.filter((r) => !selectedRoutines.some((s) => s.name === r.name));
  }, [routines, selectedCategory, selectedRoutines]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  const changeCategory = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1); // reset to first page on filter change
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) {
      setNewCategory('');
      return;
    }
    setCategories((prev) => [...prev, name]);
    setSelectedCategory(name);
    setNewCategory('');
    setShowCategoryInput(false);
    setCurrentPage(1);
  };

  // Custom categories = any not in the original CATEGORIES list.
  const customCategories = categories.filter((c) => !CATEGORIES.includes(c));
  const hasCustomCategory = customCategories.length > 0;

  const handleDeleteCategory = () => {
    // Delete the selected category if it's custom, else the most recent custom one.
    const target = !CATEGORIES.includes(selectedCategory)
      ? selectedCategory
      : customCategories[customCategories.length - 1];
    setCategories((prev) => prev.filter((c) => c !== target));
    if (selectedCategory === target) setSelectedCategory('All');
    setCurrentPage(1);
  };

  const toggleRoutine = (routine) =>
    setSelectedRoutines((prev) =>
      prev.some((s) => s.name === routine.name)
        ? prev.filter((s) => s.name !== routine.name)
        : [...prev, { name: routine.name, category: routine.category }]
    );

  const addCustomRoutine = () => {
    const name = customRoutine.trim();
    if (!name || routines.some((r) => r.name === name)) {
      setCustomRoutine('');
      return;
    }
    const category = selectedCategory === 'All' ? 'Custom' : selectedCategory;
    setRoutines((prev) => [...prev, { name, category, isCustom: true }]);
    setSelectedRoutines((prev) => [...prev, { name, category }]);
    setCustomRoutine('');
    setShowInput(false);
  };

  // Only user-added routines (never the predefined ones).
  const customRoutines = routines.filter((r) => r.isCustom);

  const handleDeleteCustomRoutine = () => {
    const target = customRoutines[customRoutines.length - 1]; // remove most recent custom one
    if (!target) return;
    setRoutines((prev) => prev.filter((r) => !(r.isCustom && r.name === target.name)));
    setSelectedRoutines((prev) => prev.filter((s) => s.name !== target.name));
  };

  // "Calculate Time Taken" → go to the separate Recurrence page (step-by-step).
  const handleCalculate = () => {
    if (selectedRoutines.length === 0) {
      setError(true); // block + show inline error
      return;
    }
    setError(false);
    navigate('/time-finder/recurrence', { state: { routines: selectedRoutines, startIndex: 0 } });
  };

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[1000px]">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-black">Time Finder</h1>
          <p className="mt-3 text-base text-gray-500">
            Track, analyze and optimize your daily time usage
          </p>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {/* 1. Category filter */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <motion.button
                  {...press}
                  key={cat}
                  type="button"
                  onClick={() => changeCategory(cat)}
                  className={
                    'rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
                    (active
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400')
                  }
                >
                  {cat}
                </motion.button>
              );
            })}

            {/* + Add Category */}
            {showCategoryInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                  autoFocus
                  placeholder="New category"
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <motion.button
                  {...press}
                  type="button"
                  onClick={addCategory}
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Add
                </motion.button>
                <motion.button
                  {...press}
                  type="button"
                  onClick={() => {
                    setShowCategoryInput(false);
                    setNewCategory('');
                  }}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </motion.button>
              </div>
            ) : (
              <motion.button
                {...press}
                type="button"
                onClick={() => setShowCategoryInput(true)}
                className="rounded-full border-2 border-dashed border-red-300 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                + Add Category
              </motion.button>
            )}

            {hasCustomCategory && !showCategoryInput && (
              <motion.button
                {...press}
                type="button"
                onClick={handleDeleteCategory}
                title="Delete Category"
                aria-label="Delete Category"
                className="rounded-full border border-red-200 bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
              >
                <FaTrash className="text-sm" />
              </motion.button>
            )}
          </div>

          {/* 4. Routine buttons */}
          <div className="grid min-h-[120px] grid-cols-3 gap-4">
            {pageItems.map((r) => {
              const active = selectedRoutines.some((s) => s.name === r.name);
              return (
                <motion.button
                  {...press}
                  key={r.name}
                  type="button"
                  onClick={() => toggleRoutine(r)}
                  aria-pressed={active}
                  title={r.name}
                  className={
                    'flex h-16 w-full items-center justify-center rounded-xl border px-3 text-center text-sm font-medium transition-colors ' +
                    (active
                      ? 'border-red-500 bg-red-500 text-white shadow-sm'
                      : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400')
                  }
                >
                  <span className="truncate">{r.name}</span>
                </motion.button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <p className="mt-2 text-center text-sm text-gray-400">All routines selected</p>
          )}

          {/* Pagination nav (centered) */}
          <div className="mt-6 flex justify-center gap-3">
            <motion.button
              {...press}
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </motion.button>
            <motion.button
              {...press}
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={selectedRoutines.length === 0}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </motion.button>
          </div>

          {/* 6. Custom routine (moved above Selected Routines) */}
          <div className="mt-6">
            {showInput ? (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customRoutine}
                  onChange={(e) => setCustomRoutine(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomRoutine()}
                  autoFocus
                  placeholder="Type a new routine"
                  className="flex-1 rounded-lg bg-gray-50 px-4 py-2 text-sm text-black placeholder:text-gray-400 ring-1 ring-gray-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <motion.button
                  {...press}
                  type="button"
                  onClick={addCustomRoutine}
                  className="rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                >
                  Add
                </motion.button>
                <motion.button
                  {...press}
                  type="button"
                  onClick={() => {
                    setShowInput(false);
                    setCustomRoutine('');
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <motion.button
                  {...press}
                  type="button"
                  onClick={() => setShowInput(true)}
                  className="rounded-lg border-2 border-dashed border-red-300 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
                >
                  + Add Custom Routine
                </motion.button>
                {customRoutines.length > 0 && (
                  <motion.button
                    {...press}
                    type="button"
                    onClick={handleDeleteCustomRoutine}
                    title="Delete Custom Routine"
                    aria-label="Delete Custom Routine"
                    className="text-red-500 transition-opacity hover:opacity-70"
                  >
                    <FaTrash className="text-base" />
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Validation error */}
          {error && selectedRoutines.length === 0 && (
            <p className="mt-6 text-center text-sm font-medium text-red-500">
              ⚠️ Please select at least one routine
            </p>
          )}

          {/* Calculate Time Taken (centered) → navigate to the Recurrence page */}
          <div className={(error && selectedRoutines.length === 0 ? 'mt-3' : 'mt-6') + ' flex justify-center'}>
            <button
              type="button"
              onClick={handleCalculate}
              className="rounded-lg bg-red-500 px-4 py-2 text-white"
            >
              Calculate Time Taken
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
