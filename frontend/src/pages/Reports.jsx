import { useEffect, useMemo, useState } from 'react';
import { FiClock, FiFileText, FiZap, FiTrendingUp, FiDownload } from 'react-icons/fi';
import { Card, StatCard, Select, Button, Spinner, PageHeader, BackButton } from '@/components/ui';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import { listAssessments } from '@/services/taService';
import { buildRealAnalytics, filterByRange } from '@/utils/taAnalytics';
import { downloadCsv, exportPdf } from '@/utils/export';
import { useToast } from '@/context/ToastContext.jsx';
import { formatMinutes } from '@/utils/format';

/**
 * Export Reports — built from the user's REAL Time Auditor assessments
 * (Supabase `time_auditor_entries`). Generates actual files:
 *   CSV "Assessment Summary"  → one row per assessment
 *   CSV "Detailed Slots"      → one row per 30-min slot
 *   PDF                       → print-friendly report of the same data
 */

const RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'latest', label: 'Latest assessment only' },
];

const TYPE_OPTIONS = ['Assessment Summary', 'Detailed Slots'];
const FORMAT_OPTIONS = ['CSV', 'PDF'];

const fmtClock = (totalMinutes) => {
  const t = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
};

function summaryRows(list) {
  return list.map((a) => ({
    date: new Date(a.date).toLocaleString(),
    'duration (min)': a.stats?.totalMin ?? 0,
    'productivity %': a.stats?.productivityPct ?? 0,
    'productive (min)': a.stats?.productiveMin ?? 0,
    'planned (min)': a.stats?.plannedMin ?? 0,
    'unproductive (min)': a.stats?.unproductiveMin ?? 0,
    'top 3': (a.top3 || []).join(' | '),
  }));
}

function slotRows(list) {
  return list.flatMap((a) =>
    (a.slots || []).map((s) => ({
      'assessment date': new Date(a.date).toLocaleDateString(),
      slot: `${fmtClock(s.startMin)} - ${fmtClock(s.endMin)}`,
      activity: s.activity,
      classification: s.classification,
      'productive type': s.productiveType || '',
      mood: s.mood || '',
      experience: s.experience || '',
      outcome: s.outcome || '',
      'top 3?': s.isTop3 ? 'Yes' : 'No',
      notes: s.notes || '',
    }))
  );
}

export default function Reports() {
  const toast = useToast();
  const [assessments, setAssessments] = useState(null); // null = loading
  const [config, setConfig] = useState({ type: 'Assessment Summary', range: 'all', format: 'CSV' });

  useEffect(() => {
    let active = true;
    listAssessments()
      .then((list) => active && setAssessments(list))
      .catch(() => active && setAssessments([]));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = assessments || [];
    if (config.range === 'latest') return filterByRange(list, { latestOnly: true });
    if (config.range === 'all') return list;
    return filterByRange(list, { days: Number(config.range) });
  }, [assessments, config.range]);

  const analytics = useMemo(() => buildRealAnalytics(filtered), [filtered]);

  function handleGenerate(e) {
    e.preventDefault();
    if (!filtered.length) {
      toast.error('No assessment data in this range to export.');
      return;
    }
    const rows = config.type === 'Detailed Slots' ? slotRows(filtered) : summaryRows(filtered);
    const stamp = new Date().toISOString().slice(0, 10);
    if (config.format === 'CSV') {
      downloadCsv(`time-auditor-${config.type === 'Detailed Slots' ? 'slots' : 'summary'}-${stamp}.csv`, rows);
      toast.success('CSV downloaded.');
    } else {
      exportPdf(`Time Auditor — ${config.type}`, [{ heading: config.type, rows }]);
      toast.info('Opening print dialog — choose "Save as PDF".');
    }
  }

  if (assessments === null) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  // Per-day productivity for the preview chart.
  const trendBars = analytics.trend.map((t) => ({ label: t.label, value: t.productivity }));

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="Export Reports" subtitle="Generate and download reports from your Time Auditor data" />

      {/* Real stats for the selected range */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiFileText} label="Assessments" value={analytics.count} tone="brand" />
        <StatCard icon={FiClock} label="Time logged" value={formatMinutes(analytics.totalTracked)} tone="info" />
        <StatCard icon={FiZap} label="Productive time" value={formatMinutes(analytics.productiveMin)} tone="success" />
        <StatCard icon={FiTrendingUp} label="Avg productivity" value={`${analytics.avgProductivity}%`} tone="warning" />
      </div>

      {/* Builder + preview */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Create report" subtitle="Choose what to include" className="lg:col-span-1">
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Report type"
              value={config.type}
              onChange={(e) => setConfig((c) => ({ ...c, type: e.target.value }))}
              options={TYPE_OPTIONS}
            />
            <Select
              label="Date range"
              value={config.range}
              onChange={(e) => setConfig((c) => ({ ...c, range: e.target.value }))}
              options={RANGE_OPTIONS}
            />
            <Select
              label="Format"
              value={config.format}
              onChange={(e) => setConfig((c) => ({ ...c, format: e.target.value }))}
              options={FORMAT_OPTIONS}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" icon={FiDownload} className="flex-1" disabled={!filtered.length}>
                Generate &amp; download
              </Button>
            </div>
            {!filtered.length && (
              <p className="text-xs text-ink-500">No assessments in this range yet.</p>
            )}
          </form>
        </Card>

        <Card
          title="Report preview"
          subtitle={`${config.type} · ${RANGE_OPTIONS.find((r) => r.value === config.range)?.label}`}
          className="lg:col-span-2"
        >
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">
              No data in this range — complete a Time Auditor assessment first.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-sm text-ink-400">Productivity per day</p>
                <BarChartCard data={trendBars} color="#f93b48" unit="%" height={200} xLabel="Day" yLabel="Productivity (%)" />
              </div>
              <div>
                <p className="mb-2 text-sm text-ink-400">Daily productivity (weekday)</p>
                <BarChartCard data={analytics.daily} color="#e51d2b" unit="%" height={200} xLabel="Day" yLabel="Productivity (%)" />
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
