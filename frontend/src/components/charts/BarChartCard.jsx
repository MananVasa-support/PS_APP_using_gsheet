import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Animated vertical bar chart. Pass `colorful` to color each bar from its
 * datum.color, otherwise a single `color` is used. Pass `average` to draw a
 * dashed reference line at that value.
 */
export default function BarChartCard({
  data,
  dataKey = 'value',
  xKey = 'label',
  color = '#f93b48',
  colorful = false,
  average,
  height = 260,
  unit = '',
  xLabel,
  yLabel,
}) {
  const computedAvg =
    average === true
      ? Math.round(data.reduce((s, d) => s + (d[dataKey] || 0), 0) / (data.length || 1))
      : typeof average === 'number'
        ? average
        : null;

  const margin = {
    top: 8,
    right: 8,
    left: yLabel ? 8 : -16,
    bottom: xLabel ? 22 : 0,
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" vertical={false} />
        <XAxis
          dataKey={xKey}
          stroke="#5a6479"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -6, fill: '#94a3b8', fontSize: 12 } : undefined}
        />
        <YAxis
          stroke="#5a6479"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 16, fill: '#94a3b8', fontSize: 12, style: { textAnchor: 'middle' } } : undefined}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        {computedAvg != null && (
          <ReferenceLine
            y={computedAvg}
            stroke="#a1a1aa"
            strokeDasharray="5 4"
            label={{ value: `Avg ${computedAvg}${unit}`, position: 'insideTopRight', fill: '#a1a1aa', fontSize: 11 }}
          />
        )}
        <Bar
          dataKey={dataKey}
          radius={[6, 6, 0, 0]}
          maxBarSize={42}
          animationDuration={900}
          animationEasing="ease-out"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={colorful ? entry.color : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
