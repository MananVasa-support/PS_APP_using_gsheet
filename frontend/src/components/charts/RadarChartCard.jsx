import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

/** Performance radar. `data` items: {metric, value}. */
export default function RadarChartCard({ data, height = 260, color = '#f93b48' }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="#2b3244" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: '#5a6479', fontSize: 12 }} />
        <Tooltip content={<ChartTooltip unit="%" />} />
        <Radar dataKey="value" name="Score" stroke={color} fill={color} fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
