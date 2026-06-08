import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPlay, FiStopCircle, FiClock, FiArchive } from 'react-icons/fi';
import { Button, Select, Badge, Modal } from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext.jsx';

const INACTIVITY_MS = 30 * 60 * 1000; // auto-move after 30 minutes idle
const WARNING_LEAD_MS = 60 * 1000; // warn 1 minute before
const CATEGORIES = ['Productive', 'Non-Productive', 'Personal', 'Uncertain'];

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Task timer. A started task runs until the user presses End. If there's no
 * interaction for 30 minutes, a warning popup appears and the task is then
 * auto-moved to the Past / Inactive section.
 */
export default function TaskTimer() {
  const toast = useToast();
  const [active, setActive] = useLocalStorage('ta_timer_active', []);
  const [past, setPast] = useLocalStorage('ta_timer_past', []);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Productive');
  const [now, setNow] = useState(Date.now());
  const [warning, setWarning] = useState(false);
  const lastActivity = useRef(Date.now());

  // 1s tick: refresh elapsed times + run the inactivity check.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      if (active.length === 0) return;
      const idle = Date.now() - lastActivity.current;
      if (idle >= INACTIVITY_MS) autoMove();
      else if (idle >= INACTIVITY_MS - WARNING_LEAD_MS) setWarning(true);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const touch = () => {
    lastActivity.current = Date.now();
    if (warning) setWarning(false);
  };

  function startTask(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setActive((a) => [{ id: `t_${Date.now()}`, name: name.trim(), category, startedAt: Date.now() }, ...a]);
    setName('');
    lastActivity.current = Date.now();
    toast.success('Task started — timer running');
  }

  function endTask(task) {
    const endedAt = Date.now();
    setActive((a) => a.filter((t) => t.id !== task.id));
    setPast((p) => [{ ...task, endedAt, durationMs: endedAt - task.startedAt, reason: 'Completed' }, ...p].slice(0, 30));
    lastActivity.current = Date.now();
    toast.success(`"${task.name}" ended`);
  }

  function autoMove() {
    setPast((p) => [
      ...active.map((t) => ({ ...t, endedAt: Date.now(), durationMs: Date.now() - t.startedAt, reason: 'Auto-paused' })),
      ...p,
    ].slice(0, 30));
    setActive([]);
    setWarning(false);
    lastActivity.current = Date.now();
    toast.info('Inactive for 30 min — task moved to Past');
  }

  // Demo helper so you don't have to wait 30 minutes to see it work.
  function simulateInactivity() {
    if (active.length === 0) return toast.info('Start a task first');
    lastActivity.current = Date.now() - (INACTIVITY_MS - 8000);
    toast.info('Simulating inactivity — warning in a moment…');
  }

  const remaining = warning ? Math.max(0, Math.ceil((INACTIVITY_MS - (now - lastActivity.current)) / 1000)) : 0;

  return (
    <div onMouseDown={touch} onKeyDown={touch}>
      {/* Start a task */}
      <form onSubmit={startTask} className="flex flex-col gap-3 sm:flex-row">
        <input className="input-base flex-1" placeholder="What are you working on?" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORIES} className="sm:w-44" />
        <Button type="submit" icon={FiPlay}>Start</Button>
      </form>

      {/* Active */}
      <div className="mt-5">
        <p className="mb-2 text-sm font-medium text-slate-300">Active</p>
        {active.length === 0 ? (
          <p className="rounded-xl bg-ink-800 p-4 text-sm text-ink-400">
            No active tasks. Start one above — the timer runs until you press <strong>End</strong>.
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence>
              {active.map((t) => (
                <motion.li
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800 p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
                    <FiClock className="h-4 w-4 animate-pulse" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{t.name}</p>
                    <p className="text-xs text-ink-500">{t.category}</p>
                  </div>
                  <span className="font-mono text-lg font-semibold tabular-nums text-white">{fmt(now - t.startedAt)}</span>
                  <Button size="sm" variant="danger" icon={FiStopCircle} onClick={() => endTask(t)}>End</Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Past / inactive */}
      <div className="mt-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
          <FiArchive className="h-4 w-4" /> Past / Inactive
        </p>
        {past.length === 0 ? (
          <p className="rounded-xl bg-ink-800 p-4 text-sm text-ink-400">Ended and auto-paused tasks appear here.</p>
        ) : (
          <ul className="space-y-2">
            {past.map((t) => (
              <li key={`${t.id}-${t.endedAt}`} className="flex items-center gap-3 rounded-xl bg-ink-850 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-300">{t.name}</p>
                  <p className="text-xs text-ink-500">{t.category}</p>
                </div>
                <span className="font-mono text-sm text-ink-300">{fmt(t.durationMs)}</span>
                <Badge tone={t.reason === 'Completed' ? 'success' : 'warning'}>{t.reason}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={simulateInactivity} className="mt-4 text-xs text-ink-500 underline hover:text-ink-300">
        Demo: simulate 30-min inactivity
      </button>

      {/* Inactivity warning */}
      <Modal
        open={warning}
        onClose={touch}
        title="Are you still working?"
        subtitle="We noticed no activity for a while."
        icon={FiClock}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => autoMove()}>Move to past now</Button>
            <Button onClick={touch}>I&apos;m still working</Button>
          </>
        }
      >
        Your active task will be moved to <strong>Past / Inactive</strong> in{' '}
        <span className="font-mono font-semibold text-brand-400">{remaining}s</span> unless you interact.
      </Modal>
    </div>
  );
}
