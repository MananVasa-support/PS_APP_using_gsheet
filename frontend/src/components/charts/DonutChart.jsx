import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Donut chart with an optional centered label. `data` items: {name,value,color}.
 */
export default function DonutChart({ data, height = 220, centerLabel, centerValue, unit = 'm' }) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip unit={unit} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xl font-bold text-fg-strong">{centerValue}</div>
            <div className="text-xs text-ink-400">{centerLabel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
