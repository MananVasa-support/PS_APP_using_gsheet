import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiZap, FiTrendingUp, FiAward, FiTarget, FiCheckCircle, FiBarChart2 } from 'react-icons/fi';
import { Button, ProgressRing, Spinner } from '@/components/ui';
import ProductivityTrend from '@/components/charts/ProductivityTrend.jsx';
import DonutChart from '@/components/charts/DonutChart.jsx';
import { buildAnalytics } from '@/data/analyticsMock';
import { useToast } from '@/context/ToastContext.jsx';
import { formatMinutes } from '@/utils/format';

/**
 * Level 2 — Advanced Productivity Mode. A motivational challenge, a top-3
 * insights side panel, and an on-demand detailed analysis.
 */
export default function Level2Panel() {
  const toast = useToast();
  const [accepted, setAccepted] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const data = useMemo(() => buildAnalytics(30), []);

  const insights = [
    { icon: FiTrendingUp, text: `Your productivity averages ${data.avgProductivity}% — top 25% of users.` },
    { icon: FiTarget, text: `Best focus window: ${data.bestHours}. Schedule deep work here.` },
    { icon: FiZap, text: `Cutting idle time (${formatMinutes(data.idleTime)}) could lift your score ~9 pts.` },
  ];

  function accept() {
    setAccepted(true);
    toast.success('Challenge accepted — Level 2 unlocked! 🔥');
  }
  function generate() {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalysis(data);
      setAnalyzing(false);
      toast.info('Detailed analysis ready');
    }, 900);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Main column */}
      <div className="space-y-4 lg:col-span-2">
        <div className="relative overflow-hidden rounded-2xl border border-brand-500/30 bg-brand-500/5 p-5">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-600/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <FiAward className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Advanced Productivity Mode</h3>
              <p className="text-sm text-ink-400">Beat your 7-day average and earn 2× XP.</p>
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Target" value={`${Math.min(100, data.avgProductivity + 10)}%`} />
            <Stat label="Current" value={`${data.avgProductivity}%`} />
            <Stat label="Reward" value="2× XP" />
          </div>
          <Button className="relative mt-4 w-full" icon={accepted ? FiCheckCircle : FiZap} disabled={accepted} onClick={accept}>
            {accepted ? 'Challenge accepted' : 'Accept the challenge'}
          </Button>
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-white">
              <FiBarChart2 className="text-brand-400" /> Detailed productivity analysis
            </h3>
            {!analysis && <Button size="sm" variant="subtle" loading={analyzing} onClick={generate}>Generate</Button>}
          </div>
          <AnimatePresence mode="wait">
            {analyzing ? (
              <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-40 place-items-center">
                <Spinner size={28} />
              </motion.div>
            ) : analysis ? (
              <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
                <ProductivityTrend data={analysis.trend} average={analysis.avgProductivity} height={200} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DonutChart data={analysis.categoryBreakdown} centerValue={formatMinutes(analysis.totalTracked)} centerLabel="Total" height={180} />
                  <div className="space-y-2 self-center">
                    {analysis.categoryBreakdown.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        <span className="text-ink-400">{c.name}</span>
                        <span className="ml-auto font-medium text-slate-200">{formatMinutes(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl bg-ink-800 p-4 text-sm text-ink-400">
                Click <strong>Generate</strong> to run a deep analysis of your last 30 days.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Side panel: top 3 insights */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-800 p-3">
          <ProgressRing value={data.productivePercent} size={56} stroke={7} />
          <div>
            <p className="text-sm font-semibold text-white">Productivity</p>
            <p className="text-xs text-ink-400">last 30 days</p>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-300">Top 3 insights</p>
        {insights.map((ins, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-3 rounded-xl border border-ink-700 bg-ink-800 p-3"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-400">
              <ins.icon className="h-4 w-4" />
            </span>
            <p className="text-sm text-slate-300">{ins.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-ink-850 p-3">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}
