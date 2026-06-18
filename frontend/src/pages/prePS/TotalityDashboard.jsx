import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { listTasks } from '@/services/totalityService';

/**
 * Totality Collector — analytics: counts, status split, and breakdowns by
 * priority and frequency, computed from the user's saved tasks.
 */
export default function TotalityDashboard() {
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    let active = true;
    listTasks()
      .then((list) => active && setTasks(list))
      .catch(() => active && setTasks([]));
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const list = tasks || [];
    const done = list.filter((t) => (t.status || 'open') === 'done').length;
    const scheduled = list.filter((t) => t.moved_to_week).length;
    const byPriority = { A: 0, B: 0, C: 0 };
    const byFrequency = {};
    list.forEach((t) => {
      if (byPriority[t.priority] != null) byPriority[t.priority] += 1;
      if (t.frequency) byFrequency[t.frequency] = (byFrequency[t.frequency] || 0) + 1;
    });
    return {
      total: list.length,
      done,
      open: list.length - done,
      scheduled,
      byPriority,
      byFrequency: Object.entries(byFrequency).sort((a, b) => b[1] - a[1]),
    };
  }, [tasks]);

  if (tasks === null) {
    return (
      <div className="grid h-[50vh] place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  const tiles = [
    { label: 'Total Tasks', value: stats.total },
    { label: 'Open', value: stats.open },
    { label: 'Done', value: stats.done },
    { label: 'Scheduled', value: stats.scheduled },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Totality Collector — counts & summaries." />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{t.label}</p>
            <p className="mt-1 text-3xl font-bold text-fg-strong">{t.value}</p>
          </Card>
        ))}
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-bold text-fg-strong">By Priority</h2>
          <div className="space-y-2">
            {['A', 'B', 'C'].map((p) => (
              <div key={p} className="flex items-center gap-3">
                <span className="w-6 text-sm font-bold text-brand-400">{p}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-brand-gradient"
                    style={{ width: stats.total ? `${(stats.byPriority[p] / stats.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-8 text-right text-sm text-fg-muted">{stats.byPriority[p]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base font-bold text-fg-strong">By Frequency</h2>
          {stats.byFrequency.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">No tasks yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.byFrequency.map(([freq, count]) => (
                <li key={freq} className="flex items-center justify-between text-sm">
                  <span className="text-fg-muted">{freq}</span>
                  <span className="font-semibold text-fg-strong">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
