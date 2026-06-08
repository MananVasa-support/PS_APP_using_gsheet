import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, OutlineButton, PageShell, PrimaryButton, TopNav } from './ui.jsx';

const INITIAL_ROWS = [
  { id: 1, category: 'Work', activity: 'Deep work', planned: '03:00', actual: '02:15' },
  { id: 2, category: 'Health', activity: 'Exercise', planned: '01:00', actual: '00:45' },
  { id: 3, category: 'Personal', activity: 'Reading', planned: '00:45', actual: '01:10' },
  { id: 4, category: 'Admin', activity: 'Email', planned: '00:30', actual: '01:00' },
];

const COLUMNS = [
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'activity', label: 'Activity', type: 'text' },
  { key: 'planned', label: 'Planned Time', type: 'time' },
  { key: 'actual', label: 'Actual Time', type: 'time' },
];

// "HH:MM" -> minutes (null if blank/invalid)
function toMinutes(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// signed minutes -> "+H:MM" / "-H:MM"
function formatDiff(planned, actual) {
  const p = toMinutes(planned);
  const a = toMinutes(actual);
  if (p === null || a === null) return '—';
  const diff = a - p; // positive = overran the plan
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

export default function EditableTable() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(INITIAL_ROWS);
  const [editing, setEditing] = useState(true);
  const [activeCell, setActiveCell] = useState(null); // `${rowId}:${colKey}`
  const [submitted, setSubmitted] = useState(false);

  const updateCell = (id, key, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
    setSubmitted(false);
  };

  return (
    <PageShell>
      <TopNav />
      <Card>
        <header className="flex items-center justify-between pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-black">Time Audit Table</h1>
          <OutlineButton
            onClick={() => setEditing((e) => !e)}
            className={editing ? 'border-red-500 text-red-500' : ''}
          >
            {editing ? 'Lock' : 'Edit'}
          </OutlineButton>
        </header>
        <div className="mb-6 border-t border-gray-200" />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {COLUMNS.map((c) => (
                  <th key={c.key} className="border border-gray-200 px-4 py-3">
                    {c.label}
                  </th>
                ))}
                <th className="border border-gray-200 px-4 py-3">Difference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {COLUMNS.map((col) => {
                    const cellId = `${row.id}:${col.key}`;
                    const isActive = activeCell === cellId;
                    return (
                      <td
                        key={col.key}
                        className={
                          'border border-gray-200 px-2 py-1 transition-colors ' +
                          (isActive ? 'bg-red-50 ring-1 ring-inset ring-red-300' : '')
                        }
                      >
                        <input
                          type={col.type}
                          value={row[col.key]}
                          readOnly={!editing}
                          onFocus={() => setActiveCell(cellId)}
                          onBlur={() => setActiveCell(null)}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                          className={
                            'w-full rounded-md bg-transparent px-2 py-2 text-black focus:outline-none ' +
                            (col.type === 'time' ? 'tabular-nums ' : '') +
                            (editing ? 'cursor-text' : 'cursor-default text-gray-700')
                          }
                        />
                      </td>
                    );
                  })}
                  {(() => {
                    const diff = formatDiff(row.planned, row.actual);
                    const over = diff.startsWith('+');
                    const under = diff.startsWith('-');
                    return (
                      <td className="border border-gray-200 px-4 py-3 font-semibold tabular-nums">
                        <span
                          className={over ? 'text-red-500' : under ? 'text-gray-500' : 'text-black'}
                        >
                          {diff}
                        </span>
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          <span className="text-sm text-gray-400">
            {submitted ? 'Saved ✓' : `${rows.length} activities`}
          </span>
          <div className="flex gap-3">
            <OutlineButton onClick={() => navigate('/time-finder/adjust')}>Back</OutlineButton>
            <PrimaryButton
              className="px-9"
              onClick={() => {
                setSubmitted(true);
                navigate('/time-finder/dashboard');
              }}
            >
              Submit
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
