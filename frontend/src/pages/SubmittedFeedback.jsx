import { useNavigate } from 'react-router-dom';
import { BackButton, PageHeader } from '@/components/ui';
import EntryLog from '@/components/ps/EntryLog.jsx';
import { useLog } from '@/components/ps/useLog.js';

/**
 * Submitted Feedback — every feedback entry the signed-in user has submitted.
 */
export default function SubmittedFeedback() {
  const navigate = useNavigate();
  const { entries, remove } = useLog('feedback-form', (d) => `${d.consultant || d.interaction} · ${d.overall ?? '—'}/5`);

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/feedback')} />
      <PageHeader title="Submitted Feedback" subtitle="All the feedback you've submitted." />
      <EntryLog
        title="Submitted Feedback"
        entries={entries}
        onDelete={remove}
        emptyText="No feedback submitted yet — add one from the Feedback Form."
        renderItem={(en) => {
          const d = en.data || {};
          const service = d.service === 'Other' ? (d.serviceOther || 'Other') : d.service;
          return (
            <div>
              <p className="text-sm font-semibold text-fg-strong">
                {d.fullName || 'Participant'}
                {service && <span className="text-fg-muted"> · {service}</span>}
              </p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                {d.consultant && <span>🧑‍💼 {d.consultant}</span>}
                {d.interaction && <span>{d.interaction}</span>}
                {d.overall != null && <span className="text-brand-400">Overall {d.overall}/5</span>}
                {d.ability != null && <span className="text-brand-400">Comm {d.ability}/5</span>}
                {d.date && <span>🗓 {d.date}</span>}
              </div>
              {d.improvements && <p className="mt-1.5 line-clamp-2 text-xs text-fg-muted">{d.improvements}</p>}
            </div>
          );
        }}
      />
    </div>
  );
}
