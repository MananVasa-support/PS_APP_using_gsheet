import { Card, Avatar, PageHeader, BackButton } from '@/components/ui';
import { rankings } from '@/data/rankingsMock';
import { formatNumber } from '@/utils/format';

const medal = ['#a1a1aa', '#94a3b8', '#52525b']; // gold / silver / bronze

export default function Top4Rankings() {
  const top4 = rankings.slice(0, 4);

  return (
    <div className="space-y-6">
      <BackButton to="/level-2" />
      <PageHeader title="Top 4 Rankings" subtitle="The top four on the challenge ranking board" />

      <Card bodyClassName="space-y-2">
        {top4.map((u) => (
          <div
            key={u.rank}
            className={`flex items-center gap-4 rounded-xl px-3 py-3 ${u.isMe ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : 'bg-ink-800'}`}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={u.rank <= 3 ? { background: medal[u.rank - 1], color: '#0b0e16' } : { background: '#202637', color: '#94a3b8' }}
            >
              {u.rank}
            </span>
            <Avatar name={u.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-fg-strong">
                {u.name} {u.isMe && <span className="text-brand-400">(You)</span>}
              </p>
              <p className="truncate text-xs text-ink-500">{u.dept} · {u.productivity}% productive · {u.streak}-day streak</p>
            </div>
            <span className="shrink-0 text-lg font-extrabold text-fg-strong">{formatNumber(u.points)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
