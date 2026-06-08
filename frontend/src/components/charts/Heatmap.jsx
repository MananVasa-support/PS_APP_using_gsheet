/**
 * Activity heatmap — weekday (rows) × hour-of-day (columns). Cell color
 * intensity maps to the productivity value (0–100). Horizontally scrollable
 * on small screens.
 *
 * @param {{label:string, values:number[]}[]} data  one row per weekday, 24 values
 */
export default function Heatmap({ data }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="min-w-[600px]">
        {/* Hour axis */}
        <div className="mb-1 flex pl-9 text-[10px] text-ink-400">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 text-center">
              {h % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>

        {/* Rows */}
        {data.map((row) => (
          <div key={row.label} className="mb-1 flex items-center">
            <span className="w-9 shrink-0 text-xs text-ink-400">{row.label}</span>
            <div className="flex flex-1 gap-1">
              {row.values.map((v, h) => (
                <div
                  key={h}
                  className="aspect-square flex-1 rounded-[3px] transition-transform hover:scale-125"
                  style={{ backgroundColor: cellColor(v) }}
                  title={`${row.label} ${String(h).padStart(2, '0')}:00 — ${v}% productive`}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-2 pl-9 text-xs text-ink-400">
          <span>Less</span>
          {[5, 30, 55, 80, 100].map((v) => (
            <span key={v} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: cellColor(v) }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function cellColor(v) {
  if (v <= 4) return 'rgb(var(--ink-700))';
  const alpha = 0.18 + (v / 100) * 0.82;
  return `rgba(249, 59, 72, ${alpha})`;
}
