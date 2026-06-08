import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiClock } from 'react-icons/fi';
import { FaTrash } from 'react-icons/fa';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const RECURRENCE_OPTIONS = [
  'Daily',
  'Weekly',
  '10 Days',
  '15 Days',
  'Monthly',
  'Quarterly',
  'Annually',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RecurrencePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const incoming = state?.routines || [];
  const start = Math.min(Math.max(0, state?.startIndex || 0), Math.max(0, incoming.length - 1));

  // Per-routine config. Spread keeps any existing fields (action/timeSaving) when
  // editing, and fills defaults for a fresh selection.
  const [data, setData] = useState(() =>
    incoming.map((r) => ({
      ...r,
      name: r.name,
      category: r.category,
      recurrence: r.recurrence || '',
      days: r.days || [],
      time: r.time || { hours: 0, minutes: 0 },
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(start);

  // No routines passed in (e.g. direct visit) → send back to the list.
  if (data.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6">
        <div className="text-center">
          <p className="mb-4 text-gray-500">No routines selected.</p>
          <button
            type="button"
            onClick={() => navigate('/time-finder/select-routines')}
            className="rounded-lg bg-red-500 px-4 py-2 text-white"
          >
            Back to Routines
          </button>
        </div>
      </div>
    );
  }

  const current = data[currentIndex];
  const isLast = currentIndex === data.length - 1;
  const valid =
    current.recurrence !== '' && (current.time.hours > 0 || current.time.minutes > 0);

  const updateCurrent = (patch) =>
    setData((prev) => prev.map((item, i) => (i === currentIndex ? { ...item, ...patch } : item)));

  const chooseRecurrence = (rec) =>
    updateCurrent({ recurrence: rec, days: rec === 'Weekly' ? current.days : [] });

  const toggleDay = (day) =>
    updateCurrent({
      days: current.days.includes(day)
        ? current.days.filter((d) => d !== day)
        : [...current.days, day],
    });

  // Hours capped at 23, minutes at 59 → total can never reach 24h (1440 min).
  const setHours = (h) => updateCurrent({ time: { ...current.time, hours: Math.min(23, Math.max(0, h)) } });
  const setMinutes = (m) =>
    updateCurrent({ time: { ...current.time, minutes: Math.min(59, Math.max(0, m)) } });

  const goNext = () => {
    if (currentIndex < data.length - 1) setCurrentIndex(currentIndex + 1);
  };

  // Remove the current routine; go to the next available one (or back to the list).
  const handleDeleteRoutine = () => {
    const updated = data.filter((_, i) => i !== currentIndex);
    if (updated.length === 0) {
      navigate('/time-finder/select-routines');
      return;
    }
    setData(updated);
    if (currentIndex >= updated.length) setCurrentIndex(updated.length - 1);
  };
  const handleSubmit = () => {
    navigate('/time-finder/align-routines', { state: { routinesData: data } });
  };

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[700px]">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">TIME FINDER ©</h1>
            <p className="text-sm text-gray-500">
              Recurrence · {currentIndex + 1} of {data.length}
            </p>
          </div>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {/* Current routine + delete (top right) */}
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">
              Routine: <span className="font-semibold text-red-500">{current.name}</span>
              <span className="ml-2 text-sm text-gray-500">({current.category})</span>
            </h3>
            <button
              type="button"
              onClick={handleDeleteRoutine}
              title="Remove this routine"
              aria-label="Remove this routine"
              className="text-red-500 transition-transform hover:scale-110"
            >
              <FaTrash />
            </button>
          </div>

          {/* Recurrence — all buttons in one line, evenly distributed */}
          <div className="mt-3 flex flex-nowrap gap-2">
            {RECURRENCE_OPTIONS.map((item) => {
              const active = current.recurrence === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseRecurrence(item)}
                  className={
                    'flex-1 whitespace-nowrap rounded-full border px-2 py-2 text-center text-sm transition-colors ' +
                    (active
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
                  }
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Weekly days (multi-select) */}
          {current.recurrence === 'Weekly' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = current.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={
                      'rounded-full border px-3 py-1 text-sm transition-colors ' +
                      (active
                        ? 'border-red-500 bg-red-500 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
                    }
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          )}

          {/* Time per instance */}
          <div className="mt-4">
            <label className="mb-2 block text-sm">Time per Instance</label>
            <div className="flex items-center gap-3">
              <FiClock className="text-lg text-gray-400" />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={current.time.hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-16 rounded-lg border px-2 py-2 text-center"
                />
                <span className="text-sm text-gray-500">hh</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={current.time.minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-16 rounded-lg border px-2 py-2 text-center"
                />
                <span className="text-sm text-gray-500">mm</span>
              </div>
            </div>
          </div>

          {/* Validation hint */}
          {!valid && (
            <p className="mt-3 text-xs text-gray-400">
              Select a recurrence and enter a time to continue.
            </p>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-end gap-3">
            <motion.button
              {...press}
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border px-4 py-2"
            >
              Back
            </motion.button>

            {isLast ? (
              <motion.button
                {...press}
                type="button"
                onClick={handleSubmit}
                disabled={!valid}
                className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit
              </motion.button>
            ) : (
              <motion.button
                {...press}
                type="button"
                onClick={goNext}
                disabled={!valid}
                className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
