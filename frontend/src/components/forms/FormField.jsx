import { FiUploadCloud, FiCheck, FiChevronDown } from 'react-icons/fi';
import ScaleInput from './ScaleInput.jsx';
import { cn } from '@/utils/cn';
import { titleCaseName } from '@/utils/format';

function Label({ q }) {
  if (!q.label) return null;
  return (
    <label className="mb-1.5 block text-sm font-medium text-fg-muted">
      {q.label}
      {q.required && <span className="text-brand-400"> *</span>}
    </label>
  );
}

/** Renders a single onboarding question based on its `type`. */
export default function FormField({ q, value, onChange, error }) {
  const errEl = error ? <p className="mt-1.5 text-xs text-brand-400">{error}</p> : null;

  switch (q.type) {
    case 'heading':
      return (
        <h3 className="border-b border-ink-700 pb-2 pt-2 font-display text-xs font-bold uppercase tracking-wider text-brand-400 first:pt-0">
          {q.label}
        </h3>
      );

    case 'legal':
      return (
        <div className="max-h-72 overflow-y-auto whitespace-pre-line rounded-xl border border-ink-700 bg-ink-800 p-4 text-sm leading-relaxed text-ink-300">
          {q.text}
        </div>
      );

    case 'textarea':
      return (
        <div>
          <Label q={q} />
          <textarea
            className={cn('input-base min-h-[120px] resize-y', error && 'border-brand-500')}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer…"
          />
          {errEl}
        </div>
      );

    case 'select':
      return (
        <div>
          <Label q={q} />
          <div className="relative">
            <select
              className={cn('input-base appearance-none pr-10', error && 'border-brand-500')}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
            >
              <option value="">Select…</option>
              {q.options.map((o) => (
                <option key={o} value={o} className="bg-ink-800">{o}</option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          </div>
          {errEl}
        </div>
      );

    case 'radio':
      return (
        <div>
          <Label q={q} />
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => {
              const active = value === o;
              return (
                <button
                  type="button"
                  key={o}
                  onClick={() => onChange(o)}
                  className={cn(
                    'rounded-xl border px-4 py-2 text-sm font-medium transition',
                    active
                      ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                      : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {errEl}
        </div>
      );

    case 'checkbox': {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (o) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
      return (
        <div>
          <Label q={q} />
          <div className="flex flex-wrap gap-2">
            {q.options.map((o) => {
              const active = arr.includes(o);
              return (
                <button
                  type="button"
                  key={o}
                  onClick={() => toggle(o)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition',
                    active
                      ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                      : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
                  )}
                >
                  <span className={cn('grid h-4 w-4 place-items-center rounded border', active ? 'border-white bg-white/20' : 'border-ink-500')}>
                    {active && <FiCheck className="h-3 w-3" />}
                  </span>
                  {o}
                </button>
              );
            })}
          </div>
          {errEl}
        </div>
      );
    }

    case 'scale':
      return (
        <div>
          <Label q={q} />
          <ScaleInput value={value} onChange={onChange} />
          {errEl}
        </div>
      );

    case 'file':
      return (
        <div>
          <Label q={q} />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-ink-600 bg-ink-800 p-4 text-sm text-ink-400 transition hover:border-brand-500/50">
            <FiUploadCloud className="h-5 w-5 shrink-0 text-brand-400" />
            <span className="flex-1 truncate">{value || 'Click to upload a file'}</span>
            <span className="rounded-lg bg-ink-700 px-3 py-1 text-xs text-fg">Browse</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              onChange={(e) => onChange(e.target.files?.[0]?.name || '')}
            />
          </label>
          <p className="mt-1 text-xs text-ink-500">Allowed: JPG, PNG or PDF</p>
          {errEl}
        </div>
      );

    // text | email | date
    default:
      return (
        <div>
          <Label q={q} />
          <input
            type={q.type === 'email' ? 'email' : q.type === 'date' ? 'date' : 'text'}
            inputMode={q.validate === 'phone' ? 'numeric' : undefined}
            maxLength={q.validate === 'phone' ? 10 : undefined}
            className={cn('input-base', error && 'border-brand-500')}
            value={value || ''}
            onChange={(e) => {
              let v = e.target.value;
              if (q.capitalize === 'words') v = titleCaseName(v);
              else if (q.validate === 'phone') v = v.replace(/\D/g, '').slice(0, 10);
              onChange(v);
            }}
            placeholder={q.type === 'email' ? 'ENTER YOUR EMAIL' : q.validate === 'phone' ? '10-digit number' : ''}
          />
          {errEl}
        </div>
      );
  }
}
