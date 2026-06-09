import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Productivity-over-time line with a dashed "average productivity" reference line.
 *
 * @param {{label:string,productivity:number}[]} data
 * @param {number} average  0–100, drawn as the reference line.
 */
export default function ProductivityTrend({
  data,
  average,
  height = 280,
  xLabel = 'Date',
  yLabel = 'Productivity (%)',
}) {
  const margin = {
    top: 8,
    right: 12,
    left: yLabel ? 8 : -16,
    bottom: xLabel ? 22 : 0,
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={margin}>
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f93b48" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#f93b48" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#5a6479"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -6, fill: '#94a3b8', fontSize: 12 } : undefined}
        />
        <YAxis
          stroke="#5a6479"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 16, fill: '#94a3b8', fontSize: 12, style: { textAnchor: 'middle' } } : undefined}
        />
        <Tooltip content={<ChartTooltip unit="%" />} cursor={{ stroke: '#3c4458' }} />
        {typeof average === 'number' && (
          <ReferenceLine
            y={average}
            stroke="#a1a1aa"
            strokeDasharray="5 4"
            label={{ value: `Avg ${average}%`, position: 'insideTopRight', fill: '#a1a1aa', fontSize: 11 }}
          />
        )}
        <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#f93b48" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
