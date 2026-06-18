import { useEffect, useMemo, useState } from 'react';
import { FiCheck, FiRotateCcw, FiTrash2 } from 'react-icons/fi';
import { Card } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  listTasks,
  setTaskStatus,
  deleteTask,
  fromRow,
  getUpcomingWeeks,
} from '@/services/totalityService';

/**
 * Shared Totality task list — loads its own data and renders the same list UI
 * (Mark as Done / Reopen + delete) used on the Totality tool page. `filter`
 * controls which tasks are shown:
 *   all      — every task
 *   planned  — only tasks moved to Power Planner (moved_to_week set)
 */
export default function TotalityTaskList({ filter = 'all', emptyText }) {
  const [tasks, setTasks] = useState([]);
  const [weeks, setWeeks] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [list, wks] = await Promise.all([
        listTasks().catch(() => []),
        getUpcomingWeeks().catch(() => []),
      ]);
      if (!active) return;
      setTasks(list);
      setWeeks(wks);
    })();
    return () => {
      active = false;
    };
  }, []);

  const weekLabel = useMemo(() => {
    const map = {};
    weeks.forEach((w) => {
      map[w.key] = w.label;
    });
    return map;
  }, [weeks]);

  const shown = filter === 'planned' ? tasks.filter((t) => t.moved_to_week) : tasks;

  async function toggleDone(row) {
    const nextStatus = (fromRow(row).status === 'done') ? 'open' : 'done';
    setTasks((list) => list.map((t) => (t.id === row.id ? { ...t, status: nextStatus } : t)));
    await setTaskStatus(row, nextStatus).catch(() =>
      listTasks().then(setTasks).catch(() => {})
    );
  }

  async function removeTask(row) {
    setTasks((list) => list.filter((t) => t.id !== row.id));
    await deleteTask(row.id).catch(() => listTasks().then(setTasks).catch(() => {}));
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-fg-strong">
          {filter === 'planned' ? 'Scheduled Tasks' : 'All Tasks'}
        </h2>
        <span className="text-xs text-ink-400">{shown.length} total</span>
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-400">
          {emptyText || 'No tasks yet.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((row) => {
            const done = (row.status || 'open') === 'done';
            return (
              <li
                key={row.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/40 p-3 transition',
                  done && 'opacity-60'
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleDone(row)}
                  className={cn(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition',
                    done
                      ? 'border-transparent bg-brand-gradient text-white'
                      : 'border-ink-600 text-transparent hover:border-brand-500'
                  )}
                  aria-label={done ? 'Mark as not done' : 'Mark as done'}
                  title={done ? 'Mark as not done' : 'Mark as done'}
                >
                  <FiCheck className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-semibold text-fg-strong', done && 'line-through')}>
                    {row.priority && <span className="text-brand-400">({row.priority}) </span>}
                    {row.subject || 'Untitled'}
                  </p>
                  {row.thing_to_get_done && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{row.thing_to_get_done}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                    {row.doer && <span>👤 {row.doer}</span>}
                    {row.frequency && <span>🔁 {row.frequency}</span>}
                    {row.target_date && <span>🎯 {row.target_date}</span>}
                    {row.moved_to_week && (
                      <span className="text-brand-400">
                        ➜ {weekLabel[row.moved_to_week] || `Week of ${row.moved_to_week}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleDone(row)}
                    className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-fg-strong"
                    title={done ? 'Reopen' : 'Mark as done'}
                  >
                    {done ? <FiRotateCcw className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTask(row)}
                    className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-800 hover:text-brand-400"
                    title="Delete"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
