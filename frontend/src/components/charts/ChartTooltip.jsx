/** Shared dark tooltip for all Recharts charts. */
export default function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-900/95 px-3 py-2 text-xs shadow-card backdrop-blur">
      {label && <p className="mb-1 font-medium text-fg">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-ink-400">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="capitalize">{entry.name}:</span>
          <span className="font-semibold text-fg-strong">
            {entry.value}
            {unit}
          </span>
        </p>
      ))}
    </div>
  );
}
