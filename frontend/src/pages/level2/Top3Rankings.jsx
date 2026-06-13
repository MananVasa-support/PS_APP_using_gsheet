import { FaTrophy } from 'react-icons/fa';
import { Card, Avatar, Badge, PageHeader, BackButton } from '@/components/ui';
import { useRankings } from '@/hooks/useRankings';
import { formatNumber } from '@/utils/format';

const medal = ['#a1a1aa', '#94a3b8', '#52525b']; // gold / silver / bronze
const order = [1, 0, 2]; // visual podium order: 2nd, 1st, 3rd

export default function Top3Rankings() {
  const rankings = useRankings(); // real cross-user leaderboard (mock until it loads)
  const top3 = rankings.slice(0, 3);

  return (
    <div className="space-y-6">
      <BackButton to="/level-2" />
      <PageHeader title="Top 3 Rankings" subtitle="The podium — your challenge's best performers" />

      <div className="grid items-end gap-4 sm:grid-cols-3">
        {order.map((idx) => {
          const u = top3[idx];
          if (!u) return null;
          const isFirst = u.rank === 1;
          return (
            <Card key={u.rank} className={`flex flex-col items-center text-center ${isFirst ? 'sm:-mt-6 ring-1 ring-brand-500/40' : ''}`}>
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold"
                style={{ background: medal[u.rank - 1], color: '#0b0e16' }}
              >
                {u.rank}
              </span>
              <div className="relative mt-4">
                <Avatar name={u.name} size={isFirst ? 80 : 64} />
                {isFirst && <FaTrophy className="absolute -right-2 -top-2 h-6 w-6 text-amber-400" />}
              </div>
              <p className="mt-3 font-semibold text-fg-strong">
                {u.name} {u.isMe && <span className="text-brand-400">(You)</span>}
              </p>
              <p className="text-xs text-ink-500">{u.dept}</p>
              <p className="mt-2 text-2xl font-extrabold text-fg-strong">{formatNumber(u.points)}</p>
              <Badge tone="brand" className="mt-2">{u.productivity}% productive</Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
