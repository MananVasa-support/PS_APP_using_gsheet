import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiZap, FiClock, FiTarget, FiSunrise, FiUsers, FiCalendar, FiGift, FiLock, FiPlay,
} from 'react-icons/fi';
import { FaFire, FaTrophy } from 'react-icons/fa';
import { Card, Badge, Avatar, Button, ProgressRing, Spinner, PageHeader, BackButton } from '@/components/ui';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import { getChallenge, joinChallenge } from '@/services/challengeService';
import { formatNumber } from '@/utils/format';

// Map achievement icon keys to components.
const achIcon = {
  sunrise: FiSunrise, flame: FaFire, clock: FiClock, zap: FiZap, target: FiTarget, trophy: FaTrophy,
};

const medal = ['#a1a1aa', '#94a3b8', '#52525b']; // gold / silver / bronze

export default function Challenges() {
  const [data, setData] = useState(null);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getChallenge().then(setData);
  }, []);

  async function handleJoin() {
    setJoining(true);
    await joinChallenge('codename');
    setJoined(true);
    setJoining(false);
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  const { challenge: c, leaderboard, achievements } = data;

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="Challenges" subtitle="Compete, build habits and climb the leaderboard" />

      {/* Hero */}
      <Card className="relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
              <FaTrophy className="h-7 w-7 text-fg-strong" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-fg-strong">{c.name}</h2>
                <Badge tone="danger" dot>{c.difficulty}</Badge>
              </div>
              <p className="mt-1 max-w-lg text-sm text-ink-400">{c.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-400">
                <span className="flex items-center gap-1.5"><FiUsers className="h-4 w-4" /> {formatNumber(c.participants)} joined</span>
                <span className="flex items-center gap-1.5"><FiCalendar className="h-4 w-4" /> {c.durationDays} days</span>
                <span className="flex items-center gap-1.5"><FiGift className="h-4 w-4 text-brand-400" /> {c.reward}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row lg:flex-col">
            <Button icon={joined ? FiTarget : FiPlay} loading={joining} onClick={handleJoin} disabled={joined} size="lg">
              {joined ? 'Challenge joined' : 'Start challenge'}
            </Button>
            <p className="text-center text-xs text-ink-400">{c.daysLeft} days left</p>
          </div>
        </div>
      </Card>

      {/* Progress + level + leaderboard */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Progress */}
        <div className="space-y-5 lg:col-span-2">
          <div className="grid gap-5 sm:grid-cols-2">
            <Card title="Overall progress" className="flex flex-col items-center justify-center">
              <ProgressRing value={c.overallProgress} size={140} stroke={12} />
              <p className="mt-3 text-sm text-ink-400">You&apos;re ahead of schedule — keep going!</p>
            </Card>
            <Card title="Current streak" className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-3">
                <FaFire className="h-12 w-12 text-brand-500" />
                <span className="text-5xl font-extrabold text-fg-strong">{c.currentStreak}</span>
              </div>
              <p className="mt-3 text-sm text-ink-400">days in a row · best is 12</p>
            </Card>
          </div>

          <Card title="Daily progress to target" subtitle="% of daily goal reached this week">
            <BarChartCard data={c.dailyTargets} color="#f93b48" unit="%" height={220} xLabel="Day" yLabel="Target (%)" />
          </Card>
        </div>

        {/* Sidebar: level + leaderboard */}
        <div className="space-y-5">
          <Card title="Your level">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-lg font-extrabold text-white shadow-glow">
                {c.level}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-fg-strong">Level {c.level}</p>
                <p className="text-xs text-ink-400">{c.levelProgress}% to level {c.level + 1}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-700">
                  <motion.div
                    className="h-full rounded-full bg-brand-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: `${c.levelProgress}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="Leaderboard" subtitle="This month" bodyClassName="space-y-1">
            {leaderboard.map((u) => (
              <div
                key={u.rank}
                className={`flex items-center gap-3 rounded-xl px-2 py-2 ${u.isMe ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : ''}`}
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                  style={u.rank <= 3 ? { background: medal[u.rank - 1], color: '#0b0e16' } : { background: '#202637', color: '#94a3b8' }}
                >
                  {u.rank}
                </span>
                <Avatar name={u.name} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">
                    {u.name} {u.isMe && <span className="text-brand-400">(You)</span>}
                  </p>
                  <p className="truncate text-xs text-ink-500">{u.dept}</p>
                </div>
                <span className="text-sm font-semibold text-fg-strong">{formatNumber(u.points)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Achievements */}
      <Card title="Achievements" subtitle="Badges you've earned along the way">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {achievements.map((a, i) => {
            const Icon = achIcon[a.icon] || FaTrophy;
            return (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`flex flex-col items-center rounded-2xl border p-4 text-center ${
                  a.unlocked ? 'border-brand-500/30 bg-ink-800' : 'border-ink-700 bg-ink-850 opacity-60'
                }`}
              >
                <span className={`relative grid h-12 w-12 place-items-center rounded-xl ${a.unlocked ? 'bg-brand-500/15 text-brand-400' : 'bg-ink-700 text-ink-400'}`}>
                  <Icon className="h-6 w-6" />
                  {!a.unlocked && (
                    <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-ink-400 ring-2 ring-ink-850">
                      <FiLock className="h-3 w-3" />
                    </span>
                  )}
                </span>
                <p className="mt-2 text-sm font-medium text-fg">{a.name}</p>
                <p className="text-xs text-ink-500">{a.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
