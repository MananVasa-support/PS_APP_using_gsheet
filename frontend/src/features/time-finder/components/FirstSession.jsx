import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, OutlineButton, PageShell, PrimaryButton, TopNav, press } from './ui.jsx';

const RECURRENCE_OPTIONS = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'];

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

function ActionButton({ children, variant = 'outline', onClick }) {
  const base = 'w-full rounded-xl px-6 py-6 text-center text-lg font-medium transition-colors';
  const styles =
    variant === 'primary'
      ? 'bg-red-500 text-white shadow-md hover:bg-red-600'
      : 'bg-white text-red-500 border-2 border-red-500 shadow-sm hover:bg-red-50';
  return (
    <motion.button {...press} type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </motion.button>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <motion.button
      {...press}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-full px-5 py-2 text-sm font-medium transition-colors ' +
        (active
          ? 'bg-red-500 text-white shadow-sm shadow-red-500/25'
          : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400')
      }
    >
      {label}
    </motion.button>
  );
}

function DayToggle({ label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ' +
        (active
          ? 'bg-red-500 text-white shadow-sm'
          : 'border border-gray-300 bg-white text-gray-500 hover:border-gray-400')
      }
    >
      {label}
    </motion.button>
  );
}

function Field({ label, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-black">{label}</h2>
      {children}
    </section>
  );
}

export default function FirstSession() {
  const navigate = useNavigate();
  const [routine, setRoutine] = useState('');
  const [recurrence, setRecurrence] = useState('Weekly');
  const [selectedDays, setSelectedDays] = useState(() => new Set(['mon', 'wed', 'fri']));
  const [time, setTime] = useState('07:30');

  const toggleDay = (key) =>
    setSelectedDays((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <PageShell>
      <TopNav />
      <Card>
        {/* Header */}
        <header className="pb-5">
          <h1 className="text-center text-3xl font-bold tracking-tight text-black">1st Session</h1>
        </header>
        <div className="border-t border-gray-200" />

        {/* Top action row — exactly 3 cards in one row, never stacked */}
        <div className="mt-8 grid grid-cols-3 gap-6 pb-8">
          <ActionButton variant="primary" onClick={() => navigate('/time-finder/adjust')}>
            Start New Assessment
          </ActionButton>
          <ActionButton onClick={() => navigate('/time-finder/table')}>Previous Assessments</ActionButton>
          <ActionButton onClick={() => navigate('/time-finder/dashboard')}>Dashboard</ActionButton>
        </div>

        {/* 2-column content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* LEFT */}
          <div className="flex flex-col gap-8">
            <Field label="Rx: Sleep">
              <input
                type="text"
                value={routine}
                onChange={(e) => setRoutine(e.target.value)}
                placeholder="Type your routine"
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 ring-1 ring-gray-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </Field>

            <Field label="Recurrence">
              <div className="flex flex-wrap gap-2">
                {RECURRENCE_OPTIONS.map((opt) => (
                  <Pill
                    key={opt}
                    label={opt}
                    active={recurrence === opt}
                    onClick={() => setRecurrence(opt)}
                  />
                ))}
              </div>
              {recurrence === 'Weekly' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-wrap gap-2 pt-1"
                >
                  {DAYS.map((day) => (
                    <DayToggle
                      key={day.key}
                      label={day.label}
                      active={selectedDays.has(day.key)}
                      onClick={() => toggleDay(day.key)}
                    />
                  ))}
                </motion.div>
              )}
            </Field>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-8">
            <Field label="Time per instance">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-red-400">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent text-lg font-semibold tabular-nums text-black focus:outline-none"
                />
                <span className="ml-auto text-xs text-gray-400">HH:MM</span>
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <OutlineButton>End Assessment</OutlineButton>
          <PrimaryButton className="px-9" onClick={() => navigate('/time-finder/adjust')}>
            Next
          </PrimaryButton>
        </div>
      </Card>
    </PageShell>
  );
}
