import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiSend } from 'react-icons/fi';
import { BackButton, Button, Card, Input, PageHeader, Badge } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { PERSONAL_SPACE_MODULES } from '@/pages/PersonalSpace.jsx';
import { MANDATORY_MSG, FIELD_REQUIRED_MSG, isEmptyValue } from '@/utils/validation';
import {
  InsightsIlluminator,
  ResultsRecorder,
  HabitChangeRegister,
  TimeSaver,
} from '@/pages/personalSpace/logTools.jsx';

// Tools rebuilt as running multi-entry LOGS (Google Sheets backed). These
// bypass the generic single-entry form below and render their own form + list.
const LOG_TOOLS = {
  'insights-illuminator': { intro: 'Capture an insight and turn it into an action.', Body: InsightsIlluminator },
  'results-recorder': { intro: 'Record small, compounding wins — fast and often.', Body: ResultsRecorder },
  'habit-change-register': { intro: 'Track deliberate habit swaps over time.', Body: HabitChangeRegister },
  'time-saver': { intro: 'Log time optimizations and how often they save you time.', Body: TimeSaver },
};

/**
 * Form schemas for the remaining single-entry Personal Space modules
 * (Productivity Calculator, Personal Notes Taker). The spec'd log tools above
 * are handled separately; saved drafts/submissions here live in localStorage.
 */
const FORM_SCHEMAS = {
  'productivity-calculator': {
    intro: 'Calculate a quick productivity score: focus ÷ total × 100.',
    fields: [
      { name: 'focusMinutes', label: 'Focus minutes', type: 'number', placeholder: '0' },
      { name: 'totalMinutes', label: 'Total work minutes', type: 'number', placeholder: '0' },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional reflection' },
    ],
    calc: (values) => {
      const f = Number(values.focusMinutes) || 0;
      const t = Number(values.totalMinutes) || 0;
      if (!t) return null;
      return Math.min(100, Math.round((f / t) * 100));
    },
  },
  'personal-notes-taker': {
    intro: 'A free-form notebook — think out loud.',
    fields: [
      { name: 'title', label: 'Title', type: 'text', placeholder: 'Note title' },
      { name: 'body', label: 'Note', type: 'textarea', placeholder: 'Write anything…', rows: 10 },
    ],
  },
};

const STORAGE_PREFIX = 'ps_personal_space_';

function loadEntry(moduleId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + moduleId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PersonalSpaceForm() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const moduleMeta = useMemo(
    () => PERSONAL_SPACE_MODULES.find((m) => m.id === moduleId),
    [moduleId]
  );
  const schema = FORM_SCHEMAS[moduleId];

  const [values, setValues] = useState(() => {
    const saved = loadEntry(moduleId);
    return saved?.values || {};
  });
  const [status, setStatus] = useState(() => {
    const saved = loadEntry(moduleId);
    return saved?.status || 'draft';
  });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  // Log tools (Insights / Results / Habit / Time Saver) render their own
  // form + running list and persist to Sheets — handled outside the generic
  // single-entry form below.
  const logTool = moduleMeta && LOG_TOOLS[moduleId];
  if (logTool) {
    const LogIcon = moduleMeta.icon;
    const { Body } = logTool;
    return (
      <div className="space-y-6">
        <BackButton to="/personal-space" />
        <PageHeader
          title={
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
                <LogIcon className="h-5 w-5" />
              </span>
              {moduleMeta.title}
            </span>
          }
          subtitle={logTool.intro}
        />
        <Body />
      </div>
    );
  }

  // If route param is unknown — friendly recovery.
  if (!moduleMeta || !schema) {
    return (
      <div className="space-y-6">
        <BackButton to="/personal-space" />
        <Card>
          <p className="py-12 text-center text-sm text-ink-400">This Personal Space module does not exist.</p>
        </Card>
      </div>
    );
  }

  const Icon = moduleMeta.icon;
  const calculated = schema.calc ? schema.calc(values) : null;

  const update = (name) => (e) => {
    const v = e.target.value;
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    if (globalError) setGlobalError('');
  };

  // Every field in the schema is mandatory.
  function validateAll() {
    const errs = {};
    for (const f of schema.fields) {
      if (isEmptyValue(values[f.name])) errs[f.name] = FIELD_REQUIRED_MSG;
    }
    return errs;
  }

  const isComplete = schema.fields.every((f) => !isEmptyValue(values[f.name]));

  function save() {
    localStorage.setItem(
      STORAGE_PREFIX + moduleId,
      JSON.stringify({ values, status: 'draft', updatedAt: new Date().toISOString() })
    );
    setStatus('draft');
    toast.success('Draft saved.');
  }

  function submit(e) {
    e.preventDefault();
    const errs = validateAll();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setGlobalError(MANDATORY_MSG);
      toast.error(MANDATORY_MSG);
      return;
    }
    setErrors({});
    setGlobalError('');
    localStorage.setItem(
      STORAGE_PREFIX + moduleId,
      JSON.stringify({ values, status: 'submitted', submittedAt: new Date().toISOString() })
    );
    setStatus('submitted');
    toast.success(`${moduleMeta.title} submitted.`);
  }

  function back() {
    // Go to the actual previous page; fall back to the Personal Space hub on a
    // hard refresh / direct link where there is no in-app history to pop.
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/personal-space');
  }

  return (
    <div className="space-y-6">
      <Button onClick={back} variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <Icon className="h-5 w-5" />
            </span>
            {moduleMeta.title}
          </span>
        }
        subtitle={schema.intro}
      >
        {status === 'submitted' && <Badge tone="success" dot>Submitted</Badge>}
        {status === 'draft' && Object.keys(values).length > 0 && (
          <Badge tone="warning" dot>Draft saved</Badge>
        )}
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={submit} className="space-y-4">
            {globalError && (
              <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-300">
                {globalError}
              </div>
            )}

            {schema.fields.map((f) => (
              <FormField
                key={f.name}
                field={f}
                value={values[f.name] || ''}
                onChange={update(f.name)}
                error={errors[f.name]}
              />
            ))}

            {schema.calc && (
              <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-4">
                <p className="text-xs uppercase tracking-wider text-brand-300">Productivity score</p>
                <p className="mt-1 text-3xl font-bold text-fg-strong">
                  {calculated == null ? '—' : `${calculated}%`}
                </p>
                <p className="mt-1 text-xs text-ink-400">Enter focus & total minutes above to calculate.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-700 pt-4">
              <Button type="button" variant="ghost" icon={FiArrowLeft} onClick={back}>
                Back
              </Button>
              <Button type="button" variant="outline" icon={FiSave} onClick={save}>
                Save
              </Button>
              <Button type="submit" icon={FiSend} disabled={!isComplete}>
                Submit
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

function FormField({ field, value, onChange, error }) {
  if (field.type === 'textarea') {
    return (
      <div>
        <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-fg-muted">
          {field.label} <span className="text-brand-400">*</span>
        </label>
        <textarea
          id={field.name}
          name={field.name}
          value={value}
          onChange={onChange}
          rows={field.rows || 4}
          placeholder={field.placeholder}
          required
          className={`input-base resize-y ${error ? 'border-brand-500 focus:border-brand-500 focus:ring-brand-500/30' : ''}`}
        />
        {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
      </div>
    );
  }
  return (
    <Input
      label={<>{field.label} <span className="text-brand-400">*</span></>}
      name={field.name}
      type={field.type}
      value={value}
      onChange={onChange}
      placeholder={field.placeholder}
      required
      error={error}
    />
  );
}
