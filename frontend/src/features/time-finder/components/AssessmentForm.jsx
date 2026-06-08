import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiClock } from 'react-icons/fi';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const CATEGORIES = [
  'Sleep & Personal Care',
  'Daily Essentials',
  'Spiritual & Mindfulness',
  'Health & Fitness',
  'Household & Organization',
  'Social Media & Entertainment',
  'Relationships',
  'Hobbies & Personal Growth',
  'Work & Professional',
  'Productivity',
];

const RECURRENCE = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Annually'];

// Labels repeat (two T's, two S's) so each toggle needs a key independent of its label.
const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

const SHOWS_DAYS = ['Weekly', 'Bi-weekly'];

function Label({ children }) {
  return <h2 className="mb-2 text-sm font-semibold text-black">{children}</h2>;
}

export default function AssessmentForm() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('Daily');
  const [selectedDays, setSelectedDays] = useState([]); // array of day keys
  const [time, setTime] = useState('07:30');
  const [duration, setDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState('Minutes');

  const toggleDay = (key) =>
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[600px]">
        <div className="rounded-xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {/* Header */}
          <h1 className="mb-6 text-2xl font-bold tracking-tight text-black">New Assessment</h1>

          {/* 1. Category */}
          <section className="mb-6">
            <Label>Select Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-black ring-1 ring-gray-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="" disabled>
                Choose a category
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </section>

          {/* 2. Recurrence */}
          <section className="mb-6">
            <Label>Recurrence</Label>
            <div className="flex flex-wrap gap-2">
              {RECURRENCE.map((opt) => {
                const active = recurrence === opt;
                return (
                  <motion.button
                    {...press}
                    key={opt}
                    type="button"
                    onClick={() => setRecurrence(opt)}
                    aria-pressed={active}
                    className={
                      'rounded-full px-5 py-2 text-sm font-medium transition-colors ' +
                      (active
                        ? 'bg-red-500 text-white shadow-sm'
                        : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400')
                    }
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>

            {/* 3. Weekly / Bi-weekly day selector */}
            {SHOWS_DAYS.includes(recurrence) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const active = selectedDays.includes(day.key);
                  return (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      key={day.key}
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      aria-pressed={active}
                      className={
                        'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-colors ' +
                        (active
                          ? 'bg-red-500 text-white shadow-sm'
                          : 'border border-gray-300 bg-white text-gray-500 hover:border-gray-400')
                      }
                    >
                      {day.label}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. Time per instance */}
          <section className="mb-6">
            <Label>Time per Instance</Label>
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-red-400">
              <FiClock className="text-lg text-gray-400" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-transparent text-base font-semibold tabular-nums text-black focus:outline-none"
              />
              <span className="ml-auto text-xs text-gray-400">HH:MM</span>
            </div>
          </section>

          {/* 5. Duration */}
          <section className="mb-8">
            <Label>Duration</Label>
            <div className="flex gap-3">
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Enter duration"
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 ring-1 ring-gray-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value)}
                className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-black ring-1 ring-gray-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option>Minutes</option>
                <option>Hours</option>
              </select>
            </div>
          </section>

          {/* 6. Action buttons */}
          <div className="flex justify-end gap-3">
            <motion.button
              {...press}
              type="button"
              onClick={() => navigate('/time-finder/')}
              className="rounded-xl border border-gray-300 bg-white px-7 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
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
    </div>
  );
}
