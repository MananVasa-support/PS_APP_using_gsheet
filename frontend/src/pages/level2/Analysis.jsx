import { Card, ProgressRing, PageHeader, BackButton } from '@/components/ui';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import { weeklyProductivity, rankings } from '@/data/rankingsMock';

export default function Analysis() {
  const avg = Math.round(weeklyProductivity.reduce((s, d) => s + d.value, 0) / weeklyProductivity.length);
  const best = weeklyProductivity.reduce((a, b) => (b.value > a.value ? b : a));
  const me = rankings.find((r) => r.isMe);

  return (
    <div className="space-y-6">
      <BackButton to="/level-2" />
      <PageHeader title="Analysis" subtitle="Your Level 2 productivity analysis" />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Average productivity" className="flex flex-col items-center justify-center">
          <ProgressRing value={avg} size={120} stroke={11} />
        </Card>
        <Card title="Best day" className="flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-white">{best.label}</span>
          <p className="mt-2 text-sm text-ink-400">{best.value}% productive</p>
        </Card>
        <Card title="Completion" className="flex flex-col items-center justify-center">
          <ProgressRing value={me?.completion ?? 0} size={120} stroke={11} />
        </Card>
        <Card title="Current streak" className="flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white">{me?.streak ?? 0}</span>
          <p className="mt-2 text-sm text-ink-400">days in a row</p>
        </Card>
      </div>

      <Card title="Weekly productivity" subtitle="Daily productivity % with weekly average">
        <BarChartCard data={weeklyProductivity} color="#f93b48" unit="%" average height={260} xLabel="Day" yLabel="Productivity (%)" />
      </Card>
    </div>
  );
}
