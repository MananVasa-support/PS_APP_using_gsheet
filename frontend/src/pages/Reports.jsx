import { useEffect, useState } from 'react';
import {
  FiClock, FiFolder, FiFileText, FiDollarSign, FiDownload, FiTrash2, FiFile,
} from 'react-icons/fi';
import { Card, StatCard, Select, Button, Badge, Spinner, PageHeader, BackButton } from '@/components/ui';
import LineChartCard from '@/components/charts/LineChartCard.jsx';
import BarChartCard from '@/components/charts/BarChartCard.jsx';
import { getReports, generateReport, deleteReport } from '@/services/reportService';
import { formatDate } from '@/utils/format';

const statIcons = [FiClock, FiFolder, FiFileText, FiDollarSign];
const formatTone = { PDF: 'danger', CSV: 'success', XLSX: 'info' };

export default function Reports() {
  const [data, setData] = useState(null);
  const [config, setConfig] = useState({ type: 'Premium Corporate', range: 'May 2026', format: 'PDF' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    getReports().then(setData);
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    const report = await generateReport(config);
    const entry = {
      id: report.id,
      name: `${config.type} Report`,
      range: config.range,
      generated: new Date().toISOString(),
      format: config.format,
      size: '1.2 MB',
    };
    setData((d) => ({ ...d, history: [entry, ...d.history] }));
    setGenerating(false);
  }

  async function handleDelete(id) {
    await deleteReport(id);
    setData((d) => ({ ...d, history: d.history.filter((r) => r.id !== id) }));
  }

  if (!data) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackButton />
      <PageHeader title="Reports" subtitle="Generate, preview and export time-tracking reports">
        <Button icon={FiDownload} variant="outline">Export all</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((s, i) => (
          <StatCard key={s.label} icon={statIcons[i]} label={s.label} value={s.value} delta={s.delta} tone={['brand', 'info', 'warning', 'success'][i]} />
        ))}
      </div>

      {/* Builder + preview */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Create report" subtitle="Choose what to include" className="lg:col-span-1">
          <form onSubmit={handleGenerate} className="space-y-4">
            <Select
              label="Report type"
              value={config.type}
              onChange={(e) => setConfig((c) => ({ ...c, type: e.target.value }))}
              options={['Premium Corporate', 'Weekly Summary', 'Monthly Productivity', 'Team Performance']}
            />
            <Select
              label="Date range"
              value={config.range}
              onChange={(e) => setConfig((c) => ({ ...c, range: e.target.value }))}
              options={['This Week', 'May 2026', 'April 2026', 'Q1 2026', 'Custom Range']}
            />
            <Select
              label="Format"
              value={config.format}
              onChange={(e) => setConfig((c) => ({ ...c, format: e.target.value }))}
              options={['PDF', 'CSV', 'XLSX']}
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={generating} icon={FiDownload} className="flex-1">
                Generate
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Report preview" subtitle={`${config.type} · ${config.range}`} className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm text-ink-400">Hours by project</p>
              <BarChartCard data={data.projectHours} unit="h" height={200} xLabel="Project" yLabel="Hours" />
            </div>
            <div>
              <p className="mb-2 text-sm text-ink-400">Focus trend</p>
              <LineChartCard
                data={data.trend}
                xKey="day"
                unit="m"
                height={200}
                xLabel="Day"
                yLabel="Focus (min)"
                series={[{ key: 'focus', name: 'Focus', color: '#f93b48' }]}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card title="Export history" subtitle="Previously generated reports" bodyClassName="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink-700 text-left text-ink-400">
              <th className="pb-3 font-medium">Report</th>
              <th className="pb-3 font-medium">Range</th>
              <th className="pb-3 font-medium">Generated</th>
              <th className="pb-3 font-medium">Format</th>
              <th className="pb-3 font-medium">Size</th>
              <th className="pb-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800">
            {data.history.map((r) => (
              <tr key={r.id} className="group">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-ink-400">
                      <FiFile className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium text-fg">{r.name}</p>
                      <p className="text-xs text-ink-500">{r.id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-ink-400">{r.range}</td>
                <td className="py-3 text-ink-400">{formatDate(r.generated)}</td>
                <td className="py-3">
                  <Badge tone={formatTone[r.format] || 'default'}>{r.format}</Badge>
                </td>
                <td className="py-3 text-ink-400">{r.size}</td>
                <td className="py-3">
                  <div className="flex justify-end gap-1">
                    <button className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-brand-400" aria-label="Download">
                      <FiDownload className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-unproductive"
                      aria-label="Delete"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
