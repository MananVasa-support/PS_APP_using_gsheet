import { useNavigate } from 'react-router-dom';
import { FiPlay } from 'react-icons/fi';
import { Button, PageHeader, BackButton } from '@/components/ui';
import { StageSummary } from './TimeAuditor.jsx';

const STORAGE_KEY = 'ta_assessments_v2';

function loadLatest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) && list.length ? list[0] : null;
  } catch {
    return null;
  }
}

export default function FinalSummary() {
  const navigate = useNavigate();
  const latest = loadLatest();

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

  return (
    <div className="space-y-6">
      <BackButton />
      <StageSummary
        slots={latest.slots}
        top3={latest.top3}
        onGoDashboard={() => navigate('/dashboard')}
      />
    </div>
  );
}
