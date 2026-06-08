import { useState } from 'react';
import { FiSlash, FiZap } from 'react-icons/fi';
import { Toggle, Badge } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';

const REASONS = [
  { id: 'social', label: 'Social media scrolling', mins: 42 },
  { id: 'notif', label: 'Constant notifications', mins: 28 },
  { id: 'meetings', label: 'Meetings that overrun', mins: 35 },
  { id: 'switching', label: 'Context switching', mins: 22 },
  { id: 'phone', label: 'Phone distractions', mins: 18 },
  { id: 'snack', label: 'Unplanned breaks', mins: 15 },
];

/** Pick the distractions to eliminate; see the estimated time reclaimed. */
export default function ReasonEliminator() {
  const toast = useToast();
  const [blocked, setBlocked] = useState({});
  const eliminated = REASONS.filter((r) => blocked[r.id]);
  const saved = eliminated.reduce((s, r) => s + r.mins, 0);

  function toggle(r, v) {
    setBlocked((b) => ({ ...b, [r.id]: v }));
    if (v) toast.success(`Eliminated: ${r.label} (~${r.mins}m/day saved)`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-brand-500/10 p-4 ring-1 ring-brand-500/20">
        <div>
          <p className="text-sm text-ink-400">Estimated time reclaimed</p>
          <p className="text-2xl font-bold text-white">{saved}m / day</p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
          <FiZap className="h-6 w-6" />
        </span>
      </div>
      <p className="text-sm text-ink-400">Toggle the distractions you want to eliminate — we factor them into your focus plan.</p>
      <ul className="space-y-3">
        {REASONS.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-800 p-3">
            <div className="flex items-center gap-3">
              <FiSlash className={`h-4 w-4 ${blocked[r.id] ? 'text-unproductive' : 'text-ink-400'}`} />
              <div>
                <p className="text-sm font-medium text-slate-200">{r.label}</p>
                <p className="text-xs text-ink-500">~{r.mins} min/day</p>
              </div>
            </div>
            <Toggle checked={!!blocked[r.id]} onChange={(v) => toggle(r, v)} />
          </li>
        ))}
      </ul>
      <Badge tone="brand" dot>{eliminated.length} eliminated</Badge>
    </div>
  );
}
