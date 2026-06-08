import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

/**
 * Smooth area/line chart. `series` describes which keys to plot.
 *
 * @param {{key:string,name:string,color:string}[]} series
 */
export default function LineChartCard({ data, series, xKey = 'day', height = 260, unit = '', xLabel, yLabel }) {
  const margin = {
    top: 8,
    right: 8,
    left: yLabel ? 8 : -16,
    bottom: xLabel ? 22 : 0,
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={margin}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#202637" vertical={false} />
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
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#3c4458' }} />
        {series.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            fill={`url(#grad-${s.key})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
