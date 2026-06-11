import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiLayers, FiPlay, FiCheck, FiX, FiRotateCcw, FiUsers, FiTrendingUp, FiAward, FiActivity } from 'react-icons/fi';
import { FaFire, FaTrophy } from 'react-icons/fa';
import { Card, Button, Badge, Avatar, ProgressRing, PageHeader, StatCard, BackButton } from '@/components/ui';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import { useChallenge } from '@/context/ChallengeContext.jsx';
import { useToast } from '@/context/ToastContext.jsx';
import { useAuthContext } from '@/context/AuthContext.jsx';
import { rankings, weeklyProductivity } from '@/data/rankingsMock'; // admin overview only (parked)
import { formatNumber } from '@/utils/format';
import { listAssessments } from '@/services/taService';
import { getLeaderboard } from '@/services/level2Service';
import { buildRealAnalytics, filterByRange } from '@/utils/taAnalytics';

const DAY_OPTIONS = [
  { days: 1, label: 'Latest' },
  { days: 3, label: 'Last 3 Days' },
  { days: 5, label: 'Last 5 Days' },
  { days: 10, label: 'Last 10 Days' },
  { days: 365, label: 'All' },
];
const medal = ['#a1a1aa', '#94a3b8', '#52525b']; // gold / silver / bronze

export default function Level2() {
  const { isAdmin, isConsultant } = useAuthContext();
  // Admin/consultant never participate — they get an overview-only view.
  if (isAdmin || isConsultant) {
    return <ChallengesOverview role={isAdmin ? 'admin' : 'consultant'} />;
  }
  return <Level2Client />;
}

function Level2Client() {
  const {
    unlocked, participating, started, days, startDate,
    setParticipating, setDays, startChallenge, resetChallenge, enterLevel2,
  } = useChallenge();
  const { user } = useAuthContext();
  const toast = useToast();

  // Entering this page unlocks the Level 2 ranking links in the sidebar.
  useEffect(() => {
    if (!unlocked) enterLevel2();
  }, [unlocked, enterLevel2]);

  // Real audit data — the challenge charts are computed from the user's actual
  // Time Auditor assessments during the challenge window (no demo numbers).
  const [assessments, setAssessments] = useState([]);
  // Cross-user leaderboard (server-computed; same list for every participant).
  const [board, setBoard] = useState([]);
  useEffect(() => {
    if (!started) return;
    let active = true;
    listAssessments()
      .then((list) => active && setAssessments(list))
      .catch(() => {});
    getLeaderboard()
      .then((rows) => active && setBoard(rows))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [started]);

  // Local UI state for the selection flow (committed to context on Start).
  const [selecting, setSelecting] = useState(false);
  const [choice, setChoice] = useState(null); // 7 | 14 | 21 | 30 | 'custom'
  const [customDays, setCustomDays] = useState('');

  const finalDays = choice === 'custom' ? Number(customDays) : choice;
  const canStart = participating === true && Number.isFinite(finalDays) && finalDays > 0;

  function handleStart() {
    if (!canStart) return toast.error('Please choose a valid number of days.');
    setDays(finalDays);
    startChallenge();
    toast.success(`Challenge started — ${finalDays} days!`);
  }

  function handleReset() {
    resetChallenge();
    setSelecting(false);
    setChoice(null);
    setCustomDays('');
    toast.success('Challenge reset.');
  }

  // ── Active challenge dashboard ─────────────────────────────────────────
  if (started) {
    const elapsedDays = startDate
      ? Math.min(days, Math.floor((Date.now() - new Date(startDate)) / 86400000) + 1)
      : 1;
    const completion = Math.min(100, Math.round((elapsedDays / days) * 100));
    const streak = elapsedDays;

    // REAL daily progress: average productivity of the user's audits on each
    // challenge day (0 = no audit done that day).
    const sameDay = (a, d) => {
      const x = new Date(a.date);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
    };
    const dailyProgress = Array.from({ length: Math.min(days, 14) }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const todays = assessments.filter((a) => sameDay(a, d));
      return {
        label: `Day ${i + 1}`,
        value: todays.length
          ? Math.round(todays.reduce((s, a) => s + (a.stats?.productivityPct || 0), 0) / todays.length)
          : 0,
      };
    });

    // Weekly productivity from real audits inside the challenge window.
    const challengeAnalytics = buildRealAnalytics(
      filterByRange(assessments, { start: startDate, end: new Date().toISOString() })
    );

    // My position on the common leaderboard (null until the board loads).
    const myRank = board.find((r) => r.user_id === user?.id)?.rank || null;

    return (
      <div className="space-y-6">
        <BackButton />
        <PageHeader title="Challenges — Active Challenge" subtitle={`${days}-day productivity challenge`}>
          <Badge tone="success" dot>Active Challenge</Badge>
          <Button variant="ghost" size="sm" icon={FiRotateCcw} onClick={handleReset}>Reset</Button>
        </PageHeader>

        {/* Top stats */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Completion %" className="flex flex-col items-center justify-center">
            <ProgressRing value={completion} size={120} stroke={11} />
          </Card>
          <Card title="Streak counter" className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-3">
              <FaFire className="h-10 w-10 text-brand-500" />
              <span className="text-4xl font-extrabold text-fg-strong">{streak}</span>
            </div>
            <p className="mt-2 text-sm text-ink-400">day{streak === 1 ? '' : 's'} in a row</p>
          </Card>
          <Card title="Day progress" className="flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold text-fg-strong">{elapsedDays}<span className="text-ink-500">/{days}</span></span>
            <p className="mt-2 text-sm text-ink-400">days completed</p>
          </Card>
          <Card title="Your rank" className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-3">
              <FaTrophy className="h-9 w-9 text-amber-400" />
              <span className="text-4xl font-extrabold text-fg-strong">
                {myRank ? `#${myRank}` : '—'}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-400">
              {myRank ? `of ${board.length} participant${board.length === 1 ? '' : 's'}` : 'syncing…'}
            </p>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Charts — built from the user's REAL audits during the challenge. */}
          <div className="space-y-5 lg:col-span-2">
            <Card title="Daily progress" subtitle="Avg productivity of your audits each challenge day">
              <BarChartCard data={dailyProgress} color="#f93b48" unit="%" height={220} xLabel="Day" yLabel="Productivity (%)" />
            </Card>
            <Card title="Productivity analysis" subtitle="Weekly average during this challenge">
              {challengeAnalytics.weekly.length ? (
                <BarChartCard data={challengeAnalytics.weekly} color="#f93b48" unit="%" average height={220} xLabel="Week" yLabel="Productivity (%)" />
              ) : (
                <p className="grid h-[220px] place-items-center text-sm text-ink-400">
                  Complete a Time Auditor assessment during the challenge to see your productivity here.
                </p>
              )}
            </Card>
          </div>

          {/* Ranking board — REAL participants only (server-computed, same list
              for everyone). Score = 50% daily-audit consistency + 50% avg
              productivity, fair across 3-day and 30-day challenges. */}
          <Card
            title="Ranking board"
            subtitle={board.length ? `Top ${Math.min(board.length, 10)} of ${board.length} participant${board.length === 1 ? '' : 's'}` : 'Live participants'}
            bodyClassName="space-y-1"
          >
            {board.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">
                No participants yet — rankings appear as people join challenges and do their daily audits.
              </p>
            ) : (
              board.slice(0, 10).map((u) => {
                const isMe = u.user_id === user?.id;
                return (
                  <div
                    key={u.user_id}
                    className={`flex items-center gap-3 rounded-xl px-2 py-2 ${isMe ? 'bg-brand-500/10 ring-1 ring-brand-500/30' : ''}`}
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
                        {u.name} {isMe && <span className="text-brand-400">(You)</span>}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {u.days}-day · {u.coverage_pct}% consistent
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-fg-strong">{u.score}</span>
                  </div>
                );
              })
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Selection flow ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="Challenges" subtitle="Join a productivity challenge and climb the ranking board" />

      <Card className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
            <FiLayers className="h-7 w-7 text-fg-strong" />
          </span>

          {/* Step 1 — Select Challenge */}
          {!selecting && participating === null && (
            <>
              <h2 className="mt-5 font-display text-2xl font-bold text-fg-strong">Ready for Challenges?</h2>
              <p className="mt-2 max-w-md text-sm text-ink-400">
                Pick a challenge, commit to a number of days, and track your progress against everyone else.
              </p>
              <Button className="mt-6" size="lg" icon={FiLayers} onClick={() => setSelecting(true)}>
                Select Challenge
              </Button>
            </>
          )}

          {/* Step 2 — Participate? */}
          {selecting && participating === null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <h2 className="mt-5 font-display text-2xl font-bold text-fg-strong">Participate?</h2>
              <p className="mt-2 text-sm text-ink-400">Would you like to take part in this challenge?</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button icon={FiCheck} onClick={() => setParticipating(true)}>Yes</Button>
                <Button variant="outline" icon={FiX} onClick={() => setParticipating(false)}>No</Button>
              </div>
            </motion.div>
          )}

          {/* Declined */}
          {participating === false && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <h2 className="mt-5 font-display text-2xl font-bold text-fg-strong">No problem 👍</h2>
              <p className="mt-2 text-sm text-ink-400">Come back whenever you're ready to take on the Challenges.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setParticipating(null); setSelecting(true); }}>
                Choose again
              </Button>
            </motion.div>
          )}

          {/* Step 3 — Select number of days */}
          {participating === true && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <h2 className="mt-5 font-display text-2xl font-bold text-fg-strong">Select number of days</h2>
              <p className="mt-2 text-sm text-ink-400">How long do you want to commit?</p>

              <div className="mt-6 flex flex-nowrap justify-center gap-2 overflow-x-auto">
                {DAY_OPTIONS.map((o) => (
                  <button
                    key={o.days}
                    onClick={() => setChoice(o.days)}
                    className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      choice === o.days
                        ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                        : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  onClick={() => setChoice('custom')}
                  className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                    choice === 'custom'
                      ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                      : 'border-ink-700 bg-ink-800 text-fg-muted hover:border-brand-500/50 hover:text-fg-strong'
                  }`}
                >
                  Custom
                </button>
              </div>

              {choice === 'custom' && (
                <div className="mx-auto mt-4 max-w-xs">
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="Enter number of days"
                    className="input-base text-center"
                  />
                </div>
              )}

              <div className="mt-6 flex justify-center gap-3">
                <Button variant="ghost" onClick={() => { setParticipating(null); setChoice(null); setCustomDays(''); }}>
                  Back
                </Button>
                <Button icon={FiPlay} onClick={handleStart} disabled={!canStart}>
                  Start Challenge
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Admin / consultant view — read-only overview of all challenge activity.   */
/* -------------------------------------------------------------------------- */
function ChallengesOverview({ role }) {
  const totalParticipants = rankings.length;
  const avgProductivity = Math.round(rankings.reduce((s, r) => s + r.productivity, 0) / totalParticipants);
  const avgCompletion = Math.round(rankings.reduce((s, r) => s + r.completion, 0) / totalParticipants);
  const topStreak = Math.max(...rankings.map((r) => r.streak));
  const top3 = rankings.slice(0, 3);

  return (
    <div className="space-y-6">
      <BackButton to={role === 'admin' ? '/admin' : '/participants'} />
      <PageHeader
        title="Challenges Overview"
        subtitle={
          role === 'admin'
            ? 'Org-wide view of every active productivity challenge'
            : 'Your assigned participants and their challenge progress'
        }
      >
        <Badge tone="brand" dot>{role === 'admin' ? 'Admin' : 'Consultant'} view</Badge>
      </PageHeader>

      {/* Headline stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiUsers} label="Active participants" value={formatNumber(totalParticipants)} tone="brand" />
        <StatCard icon={FiActivity} label="Avg. productivity" value={`${avgProductivity}%`} tone="success" />
        <StatCard icon={FiTrendingUp} label="Avg. completion" value={`${avgCompletion}%`} tone="info" />
        <StatCard icon={FaFire} label="Longest streak" value={`${topStreak} days`} tone="warning" />
      </div>

      {/* Top 3 podium */}
      <Card
        title={<span className="flex items-center gap-2"><FaTrophy className="text-brand-400" /> Top 3 performers</span>}
        subtitle="Highest scores across all active challenges"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {top3.map((r, i) => (
            <div key={r.rank} className="rounded-xl border border-ink-700 bg-ink-900/40 p-4">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-ink-950"
                  style={{ background: medal[i] }}
                >
                  {r.rank}
                </span>
                <Avatar name={r.name} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-fg-strong">{r.name}</p>
                  <p className="truncate text-xs text-ink-500">{r.dept}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Points" value={r.points} />
                <Mini label="Prod." value={`${r.productivity}%`} />
                <Mini label="Streak" value={r.streak} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly productivity */}
      <Card title="Weekly productivity" subtitle="Average across all participants this week">
        <BarChartCard data={weeklyProductivity} color="#f93b48" unit="%" average xLabel="Week" yLabel="Productivity (%)" />
      </Card>

      {/* Full leaderboard */}
      <Card
        title={<span className="flex items-center gap-2"><FiAward className="text-brand-400" /> Full leaderboard</span>}
        subtitle={`${totalParticipants} participant${totalParticipants === 1 ? '' : 's'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink-700 text-left text-ink-400">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Participant</th>
                <th className="pb-3 font-medium">Department</th>
                <th className="pb-3 font-medium">Points</th>
                <th className="pb-3 font-medium">Productivity</th>
                <th className="pb-3 font-medium">Streak</th>
                <th className="pb-3 font-medium">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {rankings.map((r) => (
                <tr key={r.rank}>
                  <td className="py-3 font-mono text-xs text-ink-300">{r.rank}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.name} size={32} />
                      <span className="text-sm font-medium text-fg">{r.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-ink-300">{r.dept}</td>
                  <td className="py-3 font-medium text-fg">{r.points}</td>
                  <td className="py-3">{r.productivity}%</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-ink-300">
                      <FaFire className="h-3 w-3 text-brand-500" /> {r.streak}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-700">
                        <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${r.completion}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs text-ink-400">{r.completion}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-lg bg-ink-800 px-2 py-1.5">
      <p className="text-sm font-semibold text-fg-strong">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
    </div>
  );
}
