import { useNavigate } from 'react-router-dom';
import { FiPlay, FiClock, FiTrendingUp, FiAward } from 'react-icons/fi';
import { Button, PageHeader, BackButton } from '@/components/ui';
import { StageSummary } from './TimeAuditor.jsx';

const STORAGE_KEY = 'ta_assessments_v2';

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function StatBox({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold text-fg-strong">{value}</p>
        <p className="text-sm text-ink-400">{label}</p>
      </div>
    </div>
  );
}

export default function FinalSummary() {
  const navigate = useNavigate();
  const all = loadAll();
  const latest = all.length ? all[0] : null;

  if (!latest) {
    return (
      <div className="space-y-6">
        <BackButton />
        <PageHeader title="Time Auditor Final Summary" subtitle="Your most recent assessment summary." />
        <div className="rounded-2xl border border-ink-700 bg-ink-850 p-10 text-center">
          <p className="text-sm text-ink-400">No assessments yet. Start a new one to see your final summary here.</p>
          <div className="mt-5 flex justify-center">
            <Button icon={FiPlay} onClick={() => navigate('/time-auditor')}>Start New Assessment</Button>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate stats across ALL assessments (the 3 boxes formerly on Profile).
  const count = all.length;
  const totalMin = all.reduce((s, a) => s + (a.stats?.totalMin || (a.slots?.length || 0) * 30), 0);
  const avgProd = count
    ? Math.round(all.reduce((s, a) => s + (a.stats?.productivityPct || 0), 0) / count)
    : 0;
  const hours = (totalMin / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatBox icon={FiClock} label="Hours logged" value={`${hours} h`} />
        <StatBox icon={FiTrendingUp} label="Avg. productivity" value={`${avgProd}%`} />
        <StatBox icon={FiAward} label="Current level" value={`Lvl ${count}`} />
      </div>

      <StageSummary
        slots={latest.slots}
        top3={latest.top3}
        onGoDashboard={() => navigate('/dashboard')}
      />
    </div>
  );
}
