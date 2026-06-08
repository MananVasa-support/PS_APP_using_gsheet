import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPlus, FiCheckCircle, FiCircle, FiTrash2 } from 'react-icons/fi';
import { Button, Select, Badge } from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext.jsx';

const PRIORITIES = ['High', 'Medium', 'Low'];
const priTone = { High: 'danger', Medium: 'warning', Low: 'info' };

/** Plan focus blocks for the day: add, prioritize, check off. Persisted locally. */
export default function PowerPlanner() {
  const toast = useToast();
  const [items, setItems] = useLocalStorage('ta_planner', []);
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState('Medium');

  function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setItems((i) => [{ id: `p_${Date.now()}`, text: text.trim(), time, priority, done: false }, ...i]);
    setText('');
    setTime('');
    toast.success('Added to your plan');
  }
  const toggle = (id) => setItems((i) => i.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => setItems((i) => i.filter((x) => x.id !== id));
  const done = items.filter((i) => i.done).length;

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input className="input-base" placeholder="Plan a task or focus block…" value={text} onChange={(e) => setText(e.target.value)} />
        <input type="time" className="input-base sm:w-32" value={time} onChange={(e) => setTime(e.target.value)} />
        <Select value={priority} onChange={(e) => setPriority(e.target.value)} options={PRIORITIES} className="sm:w-32" />
        <Button type="submit" icon={FiPlus}>Add</Button>
      </form>

      {items.length > 0 && <p className="text-sm text-ink-400">{done}/{items.length} completed</p>}

      {items.length === 0 ? (
        <p className="rounded-xl bg-ink-800 p-4 text-sm text-ink-400">No planned items yet. Add your first focus block above.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {items.map((it) => (
              <motion.li
                key={it.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800 p-3"
              >
                <button onClick={() => toggle(it.id)} className="text-brand-400" aria-label="Toggle done">
                  {it.done ? <FiCheckCircle className="h-5 w-5" /> : <FiCircle className="h-5 w-5 text-ink-500" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm ${it.done ? 'text-ink-500 line-through' : 'text-slate-200'}`}>{it.text}</p>
                  {it.time && <p className="text-xs text-ink-500">{it.time}</p>}
                </div>
                <Badge tone={priTone[it.priority]}>{it.priority}</Badge>
                <button onClick={() => remove(it.id)} className="text-ink-400 hover:text-unproductive" aria-label="Remove">
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
