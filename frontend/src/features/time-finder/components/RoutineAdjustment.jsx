import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, OutlineButton, PageShell, PrimaryButton, TopNav, press } from './ui.jsx';

const STRATEGIES = ['Automate', 'Reduce', 'Stop'];

function StrategyButton({ label, active, onClick }) {
  return (
    <motion.button
      {...press}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'flex-1 rounded-xl px-6 py-5 text-base font-semibold transition-colors ' +
        (active
          ? 'bg-red-500 text-white shadow-sm shadow-red-500/25'
          : 'border border-red-500 bg-white text-red-500 hover:bg-red-50')
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

export default function RoutineAdjustment() {
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState('Automate');
  const [name, setName] = useState('');
  const [time, setTime] = useState('00:30');
  const [saving, setSaving] = useState('00:15');

  return (
    <PageShell>
      <TopNav />
      <Card>
        <header className="pb-5">
          <h1 className="text-center text-3xl font-bold tracking-tight text-black">
            Time to Align Your Routines
          </h1>
        </header>
        <div className="border-t border-gray-200" />

        {/* Strategy buttons */}
        <div className="flex flex-col gap-4 py-8 md:flex-row">
          {STRATEGIES.map((s) => (
            <StrategyButton key={s} label={s} active={strategy === s} onClick={() => setStrategy(s)} />
          ))}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Field label="Insert Name (optional)">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning emails"
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-black placeholder:text-gray-400 ring-1 ring-gray-200 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </Field>

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

        {/* Possible time saving */}
        <div className="mt-8">
          <Field label="Possible Time Saving">
            <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200 focus-within:ring-2 focus-within:ring-red-400">
              <input
                type="time"
                value={saving}
                onChange={(e) => setSaving(e.target.value)}
                className="bg-transparent text-lg font-semibold tabular-nums text-red-600 focus:outline-none"
              />
              <span className="ml-auto text-xs text-red-400">per instance</span>
            </div>
          </Field>
        </div>

        {/* Footer */}
        <div className="mt-10 flex justify-end gap-3 border-t border-gray-200 pt-6">
          <OutlineButton onClick={() => navigate('/time-finder/')}>End Assessment</OutlineButton>
          <PrimaryButton className="px-9" onClick={() => navigate('/time-finder/table')}>
            Next
          </PrimaryButton>
        </div>
      </Card>
    </PageShell>
  );
}
