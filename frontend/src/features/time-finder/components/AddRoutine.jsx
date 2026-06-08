import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const INITIAL_ROUTINES = [
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

export default function AddRoutine() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState(INITIAL_ROUTINES);
  const [selectedRoutines, setSelectedRoutines] = useState([]);
  const [customRoutine, setCustomRoutine] = useState('');
  const [showInput, setShowInput] = useState(false);

  const toggleRoutine = (name) =>
    setSelectedRoutines((prev) =>
      prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]
    );

  const addCustomRoutine = () => {
    const name = customRoutine.trim();
    if (!name || routines.includes(name)) {
      setCustomRoutine('');
      return;
    }
    setRoutines((prev) => [...prev, name]);
    setSelectedRoutines((prev) => [...prev, name]); // auto-select the new one
    setCustomRoutine('');
    setShowInput(false);
  };

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[900px]">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black">TIME FINDER ©</h1>
          <p className="mt-1 text-sm text-gray-500">Add Your Routine</p>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          <h2 className="mb-4 text-sm font-semibold text-black">
            Select Routines
            {selectedRoutines.length > 0 && (
              <span className="ml-2 font-normal text-gray-400">
                ({selectedRoutines.length} selected)
              </span>
            )}
          </h2>

          {/* Routine buttons */}
          <div className="grid grid-cols-3 gap-3">
            {routines.map((name) => {
              const active = selectedRoutines.includes(name);
              return (
                <motion.button
                  {...press}
                  key={name}
                  type="button"
                  onClick={() => toggleRoutine(name)}
                  aria-pressed={active}
                  className={
                    'cursor-pointer rounded-lg border px-4 py-2 text-center text-sm font-medium transition-colors ' +
                    (active
                      ? 'border-red-500 bg-red-500 text-white shadow-sm'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
                  }
                >
                  {name}
                </motion.button>
              );
            })}
          </div>

          {/* Custom routine */}
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
              <motion.button
                {...press}
                type="button"
                onClick={() => setShowInput(true)}
                className="rounded-lg border-2 border-dashed border-red-300 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
              >
                + Add Custom Routine
              </motion.button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate('/time-finder/')}
            className="rounded-xl border border-gray-300 bg-white px-7 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Back
          </motion.button>
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate('/time-finder/assessment')}
            className="rounded-xl bg-red-500 px-9 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600"
          >
            Next
          </motion.button>
        </div>
      </div>
    </div>
  );
}
