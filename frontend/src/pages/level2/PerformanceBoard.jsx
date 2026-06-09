import { Card, Avatar, PageHeader, BackButton } from '@/components/ui';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import { rankings } from '@/data/rankingsMock';
import { formatNumber } from '@/utils/format';

export default function PerformanceBoard() {
  const chartData = rankings.map((u) => ({ label: u.name.split(' ')[0], value: u.points }));

  return (
    <div className="space-y-6">
      <BackButton to="/level-2" />
      <PageHeader title="Performance Board" subtitle="Full performance breakdown across the challenge" />

      <Card title="Points by participant">
        <BarChartCard data={chartData} color="#f93b48" height={260} xLabel="Participant" yLabel="Points" />
      </Card>

      <Card title="Detailed performance" bodyClassName="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-xs uppercase tracking-wide text-ink-500">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Participant</th>
              <th className="px-3 py-2 font-semibold">Productivity</th>
              <th className="px-3 py-2 font-semibold">Streak</th>
              <th className="px-3 py-2 font-semibold">Completion</th>
              <th className="px-3 py-2 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((u) => (
              <tr key={u.rank} className={`border-b border-ink-800 ${u.isMe ? 'bg-brand-500/10' : ''}`}>
                <td className="px-3 py-3 font-bold text-fg-strong">{u.rank}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size={32} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">
                        {u.name} {u.isMe && <span className="text-brand-400">(You)</span>}
                      </p>
                      <p className="truncate text-xs text-ink-500">{u.dept}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-fg-muted">{u.productivity}%</td>
                <td className="px-3 py-3 text-fg-muted">{u.streak} days</td>
                <td className="px-3 py-3 text-fg-muted">{u.completion}%</td>
                <td className="px-3 py-3 text-right font-semibold text-fg-strong">{formatNumber(u.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
