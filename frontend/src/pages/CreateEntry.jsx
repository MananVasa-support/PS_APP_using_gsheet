import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiClock, FiPlus, FiTrash2, FiSave, FiSunset, FiArchive, FiX, FiCheckCircle, FiBarChart2,
} from 'react-icons/fi';
import { Button, Select, Badge, ProgressRing, Modal, PageHeader } from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext.jsx';
import { formatDate } from '@/utils/format';

const CATEGORIES = ['Productive', 'Non-Productive', 'Personal', 'Not Sure'];
const catColor = {
  Productive: '#e51d2b',
  'Non-Productive': '#ef4444',
  Personal: '#71717a',
  'Not Sure': '#a1a1aa',
};
const catTone = { Productive: 'success', 'Non-Productive': 'danger', Personal: 'personal', 'Not Sure': 'warning' };

const START_MIN = 6 * 60; // day starts at 6:00 AM
const STEP = 30; // 30-minute blocks
const REMINDER_MS = 45 * 1000; // show reminder after 45s idle
const AUTO_MOVE_MS = 75 * 1000; // auto-move 30s after the reminder

/** "06:00 AM" label for a slot index. */
function slotLabel(slot) {
  const total = START_MIN + slot * STEP;
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

const newBlock = (slot) => ({ id: `b_${slot}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, slot, task: '', category: 'Productive' });
const initialBlocks = () => [0, 1, 2, 3].map(newBlock);

export default function CreateEntry() {
  const toast = useToast();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useLocalStorage('ta_day_blocks', initialBlocks());
  const [inactive, setInactive] = useLocalStorage('ta_day_inactive', []);
  const [reminder, setReminder] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [summary, setSummary] = useState(null);
  const lastActivity = useRef(Date.now());

  const touch = () => {
    lastActivity.current = Date.now();
    if (reminder) setReminder(false);
  };

  // Inactivity loop: remind, then auto-move the active block to Past / Inactive.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      const idle = Date.now() - lastActivity.current;
      if (idle >= AUTO_MOVE_MS) handleAutoMove();
      else if (idle >= REMINDER_MS) setReminder(true);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  function updateBlock(id, patch) {
    touch();
    setBlocks((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
      const last = next[next.length - 1];
      // Auto-append the next time block once the last row gets a task.
      if (last.id === id && 'task' in patch && last.task.trim() !== '') {
        next.push(newBlock(last.slot + 1));
      }
      return next;
    });
  }

  function addBlock() {
    touch();
    setBlocks((prev) => [...prev, newBlock(prev[prev.length - 1].slot + 1)]);
  }

  function removeBlock(id) {
    touch();
    setBlocks((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev));
  }

  function handleAutoMove() {
    const active = blocks[blocks.length - 1];
    lastActivity.current = Date.now();
    setReminder(false);
    if (!active || active.task.trim() === '') return; // nothing meaningful to move
    setInactive((list) => [{ ...active, reason: 'Auto-moved (inactive)' }, ...list].slice(0, 50));
    setBlocks((prev) => [...prev.slice(0, -1), newBlock(active.slot + 1)]);
    toast.info('No activity detected — current block moved to Past / Inactive');
  }

  // Demo helper so inactivity is testable without a long wait.
  function simulateInactivity() {
    lastActivity.current = Date.now() - (AUTO_MOVE_MS - 6000);
    toast.info('Simulating inactivity — reminder now, auto-move shortly…');
  }

  const filled = blocks.filter((b) => b.task.trim());
  const progress = Math.round((filled.length / blocks.length) * 100);
  const remaining = reminder ? Math.max(0, Math.ceil((AUTO_MOVE_MS - (now - lastActivity.current)) / 1000)) : 0;

  function saveEntry() {
    if (filled.length === 0) return toast.info('Add at least one activity first');
    try {
      const store = JSON.parse(localStorage.getItem('ta_saved_entries') || '[]');
      const stamped = filled.map((b) => ({ time: slotLabel(b.slot), task: b.task, category: b.category, date: new Date().toISOString() }));
      localStorage.setItem('ta_saved_entries', JSON.stringify([...stamped, ...store].slice(0, 500)));
    } catch {
      /* ignore storage errors */
    }
    toast.success(`${filled.length} ${filled.length === 1 ? 'activity' : 'activities'} saved`);
  }

  function endDay() {
    const all = [...filled, ...inactive.filter((b) => b.task.trim())];
    const byCat = CATEGORIES.map((c) => ({ name: c, count: all.filter((b) => b.category === c).length }));
    const productive = byCat.find((c) => c.name === 'Productive')?.count || 0;
    setSummary({ total: all.length, byCat, productivePct: all.length ? Math.round((productive / all.length) * 100) : 0 });
  }

  function startNewDay() {
    setBlocks(initialBlocks());
    setInactive([]);
    setSummary(null);
    lastActivity.current = Date.now();
    toast.success('Fresh day started');
  }

  const activeId = blocks[blocks.length - 1]?.id;

  return (
    <div className="pb-28" onMouseDown={touch} onKeyDown={touch}>
      <PageHeader title="Create New Entry" subtitle="Log your day in 30-minute blocks">
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-ink-400 sm:block">{formatDate(new Date())}</span>
          <div className="flex items-center gap-2">
            <ProgressRing value={progress} size={48} stroke={6}>
              <span className="text-xs font-bold text-fg-strong">{progress}%</span>
            </ProgressRing>
            <span className="text-sm text-ink-400">Day progress</span>
          </div>
        </div>
      </PageHeader>

      {/* Timeline */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {blocks.map((b) => {
              const isActive = b.id === activeId;
              return (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  className={`group flex flex-col gap-2.5 rounded-xl border bg-ink-850/60 p-2.5 sm:flex-row sm:items-center ${
                    isActive ? 'border-brand-500/50 ring-1 ring-brand-500/30' : 'border-ink-700'
                  }`}
                >
                  {/* category accent */}
                  <span className="hidden w-1 self-stretch rounded-full sm:block" style={{ background: catColor[b.category] }} />

                  {/* Left — time */}
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-800 px-3 py-2 text-sm font-medium text-fg">
                    <FiClock className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-ink-400'}`} />
                    <span className="tabular-nums">{slotLabel(b.slot)}</span>
                    {isActive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />}
                  </span>

                  {/* Middle — task input */}
                  <input
                    className="input-base flex-1"
                    placeholder="What did you work on?"
                    value={b.task}
                    onChange={(e) => updateBlock(b.id, { task: e.target.value })}
                  />

                  {/* Right — category */}
                  <Select
                    value={b.category}
                    onChange={(e) => updateBlock(b.id, { category: e.target.value })}
                    options={CATEGORIES}
                    className="sm:w-44"
                  />

                  <button
                    onClick={() => removeBlock(b.id)}
                    className="hidden rounded-lg p-2 text-ink-400 opacity-0 transition hover:text-unproductive group-hover:opacity-100 sm:block"
                    aria-label="Remove block"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>

        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" icon={FiPlus} onClick={addBlock}>Add time block</Button>
          <button onClick={simulateInactivity} className="text-xs text-ink-500 underline hover:text-ink-300">
            Demo: simulate inactivity
          </button>
        </div>
      </div>

      {/* Past / Inactive */}
      {inactive.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-fg-muted">
            <FiArchive className="h-4 w-4" /> Past / Inactive
          </p>
          <ul className="space-y-2">
            <AnimatePresence>
              {inactive.map((b) => (
                <motion.li
                  key={b.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl bg-ink-850 p-3"
                >
                  <span className="text-sm tabular-nums text-ink-400">{slotLabel(b.slot)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{b.task || '—'}</span>
                  <Badge tone={catTone[b.category]}>{b.category}</Badge>
                  <Badge tone="warning">{b.reason}</Badge>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-4 z-20 mt-6">
        <div className="glass flex flex-col gap-3 rounded-2xl p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="px-1 text-sm text-ink-400">
            <span className="font-semibold text-fg-strong">{filled.length}</span> logged ·{' '}
            <span className="font-semibold text-fg-strong">{blocks.length}</span> blocks
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" icon={FiSave} className="flex-1 sm:flex-none" onClick={saveEntry}>Save Entry</Button>
            <Button icon={FiSunset} className="flex-1 sm:flex-none" onClick={endDay}>End Day</Button>
          </div>
        </div>
      </div>

      {/* Inactivity reminder — small popup */}
      <AnimatePresence>
        {reminder && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 z-40 w-[20rem] max-w-[calc(100vw-2rem)] -translate-x-1/2"
          >
            <div className="glass flex items-start gap-3 rounded-2xl p-4 shadow-card ring-1 ring-brand-500/30">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
                <FiClock className="h-4 w-4 animate-pulse" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg-strong">Still working?</p>
                <p className="text-xs text-ink-400">
                  No activity for a while. The current block moves to Past in{' '}
                  <span className="font-mono text-brand-400">{remaining}s</span>.
                </p>
              </div>
              <button onClick={touch} className="rounded-lg bg-brand-gradient px-2.5 py-1 text-xs font-semibold text-white">
                I&apos;m here
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End-day summary */}
      <Modal
        open={Boolean(summary)}
        onClose={() => setSummary(null)}
        title="Day complete 🎉"
        subtitle="Here's how your day looks"
        icon={FiCheckCircle}
        tone="success"
        footer={
          <>
            <Button variant="ghost" onClick={startNewDay}>Start new day</Button>
            <Button icon={FiBarChart2} onClick={() => navigate('/analytics?focus=complete')}>View analytics</Button>
          </>
        }
      >
        {summary && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <ProgressRing value={summary.productivePct} size={84} stroke={9} />
              <div>
                <p className="text-2xl font-bold text-fg-strong">{summary.total}</p>
                <p className="text-sm text-ink-400">activities logged today</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {summary.byCat.map((c) => (
                <div key={c.name} className="flex items-center gap-2 rounded-xl bg-ink-800 p-2.5 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColor[c.name] }} />
                  <span className="text-ink-400">{c.name}</span>
                  <span className="ml-auto font-semibold text-fg">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
