import { useMemo } from 'react';
import { FiFileText } from 'react-icons/fi';
import { Badge } from '@/components/ui';
import { onboardingSections } from '@/data/onboardingForm';

/**
 * Read-only renderer for a client's submitted onboarding forms (Health Check,
 * ECG Pre/Post, Consent). Question ids are mapped back to their human labels
 * using the onboarding schema so admins/consultants see readable answers.
 */

const TYPE_LABELS = {
  health: 'Health Check Form',
  'ecg-pre': 'ECG (Pre)',
  'ecg-post': 'ECG (Post)',
  consent: 'Consent Form',
};

// Build a flat { questionId → label } map once from the onboarding schema.
function buildLabelMap() {
  const map = {};
  for (const section of onboardingSections) {
    for (const q of section.questions) {
      if (q.type === 'heading' || q.type === 'legal') continue;
      map[q.id] = q.label;
    }
  }
  return map;
}

function prettify(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === '' || value === null || value === undefined) return '—';
  return String(value);
}

export default function FormsViewer({ forms = [] }) {
  const labelMap = useMemo(buildLabelMap, []);

  if (!forms.length) {
    return (
      <div className="grid place-items-center gap-2 py-10 text-center text-ink-400">
        <FiFileText className="h-8 w-8 text-ink-600" />
        <p className="text-sm">No forms submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {forms.map((form) => {
        const entries = Object.entries(form.data || {}).filter(([, v]) => v !== '' && v != null);
        return (
          <div key={form.id || form.type} className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
                <FiFileText className="h-4 w-4 text-brand-400" />
                {TYPE_LABELS[form.type] || form.type}
              </h4>
              <Badge tone="default">{entries.length} fields</Badge>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-ink-400">No answers recorded.</p>
            ) : (
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {entries.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-xs text-ink-500">{labelMap[key] || key}</dt>
                    <dd className="mt-0.5 break-words text-sm text-slate-200">{prettify(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}
