import { PageHeader } from '@/components/ui';
import EntryLog from '@/components/ps/EntryLog.jsx';
import { useLog } from '@/components/ps/useLog.js';

/**
 * Submitted Feedback — every feedback entry the signed-in user has submitted.
 */
export default function SubmittedFeedback() {
  const { entries, remove } = useLog('feedback-form', (d) => `${d.interaction} · ${d.rating}/5`);

  return (
    <div className="space-y-6">
      <PageHeader title="Submitted Feedback" subtitle="All the feedback you've submitted." />
      <EntryLog
        title="Submitted Feedback"
        entries={entries}
        onDelete={remove}
        emptyText="No feedback submitted yet — add one from the Feedback Form."
        renderItem={(en) => (
          <div>
            <p className="text-sm font-semibold text-fg-strong">
              <span className="text-brand-400">{en.data.interaction}</span> — {en.data.rating}/5
            </p>
            <p className="mt-1 text-[11px] text-ink-400">🗓 {en.data.date}</p>
          </div>
        )}
      />
    </div>
  );
}
