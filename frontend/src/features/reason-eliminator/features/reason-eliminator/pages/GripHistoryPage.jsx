import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiClock,
  FiActivity,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiDownload,
  FiArchive,
  FiRotateCcw,
} from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import EmptyState from '@/features/reason-eliminator/components/common/EmptyState.jsx';
import RecentFilterBar from '../components/RecentFilterBar.jsx';
import gripHistoryService from '../services/gripHistoryService.js';
import { gripStatus } from '../services/gripTestService.js';
import { formatDate } from '../utils/formatters.js';
import { filterRecent } from '../utils/recentFilter.js';

const EXPORT_COLUMNS = ['R No.', 'Reason', 'Grip Score', 'Grip Status'];
const rowsFor = (run) =>
  (run.entries || []).map((e, i) => [
    `R${i + 1}`,
    e.text || '',
    e.score,
    e.status || gripStatus(e.score),
  ]);
const fileSlug = (run) =>
  formatDate(run.date)
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'grip-test';

export default function GripHistoryPage() {
  const navigate = useNavigate();
  // Bumped after a delete/archive so the runs list re-reads from storage.
  const [version, setVersion] = useState(0);
  // Toggles between the active grip tests and the Archived view.
  const [showArchived, setShowArchived] = useState(false);

  // Newest first. Each run is a separate dated Grip Test — earlier runs are
  // never overwritten, so the full history shows over time.
  const runs = useMemo(
    () => gripHistoryService.getRuns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );
  const activeRuns = useMemo(() => runs.filter((r) => !r.archived), [runs]);
  const archivedRuns = useMemo(() => runs.filter((r) => r.archived), [runs]);

  // Recent filter (Latest / Last 3 / Last 5 / Last 10 / All / From–To), same as
  // Previous Assessments. Only shapes what is displayed.
  const [recent, setRecent] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const sourceRuns = showArchived ? archivedRuns : activeRuns;
  const filteredRuns = useMemo(
    () =>
      filterRecent(sourceRuns, recent, (run) => run.date, {
        from: customFrom,
        to: customTo,
      }),
    [sourceRuns, recent, customFrom, customTo]
  );

  // Stable chronological numbers across ALL runs: earliest Grip Test is 1.
  const numberById = useMemo(() => {
    const ordered = [...runs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const m = {};
    ordered.forEach((r, i) => {
      m[r.id] = i + 1;
    });
    return m;
  }, [runs]);

  const handleDelete = (runId) => {
    if (!window.confirm('Delete this Grip Test? This cannot be undone.')) return;
    gripHistoryService.deleteRun(runId);
    setVersion((v) => v + 1);
  };
  const archiveRun = (runId) => {
    gripHistoryService.setArchived(runId, true);
    setVersion((v) => v + 1);
  };
  const unarchiveRun = (runId) => {
    gripHistoryService.setArchived(runId, false);
    setVersion((v) => v + 1);
  };

  const exportExcel = (run) => {
    const csvCell = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [EXPORT_COLUMNS, ...rowsFor(run)]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + lines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grip-test-${fileSlug(run)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = (run) => {
    const esc = (v) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const body = rowsFor(run)
      .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html><html><head><title>Grip Test</title>
      <meta charset="utf-8" />
      <style>
        body{font-family:Inter,Arial,sans-serif;color:#1A1A1D;padding:24px;}
        h1{font-size:20px;margin:0 0 4px;}
        p{color:#52525B;margin:0 0 16px;font-size:12px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th,td{border:1px solid #E4E4E7;padding:8px 10px;text-align:left;vertical-align:top;}
        th{background:#F7F7F8;text-transform:uppercase;font-size:10px;letter-spacing:.06em;}
      </style></head><body>
      <h1>Grip Test</h1>
      <p>${esc(formatDate(run.date))}</p>
      <table><thead><tr>${EXPORT_COLUMNS.map((c) => `<th>${c}</th>`).join(
        ''
      )}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Grip Test"
        title="Grip History"
        description="Every Grip Test you have completed, kept separately by date."
      />

      {runs.length === 0 ? (
        <EmptyState
          icon={<FiClock size={20} />}
          title="No Grip Test history yet"
          description="Complete a Grip Test and each one will appear here with its own date and scores."
          action={
            <Button
              leftIcon={<FiActivity />}
              onClick={() => navigate('/reason-eliminator/grip-test')}
            >
              Start Grip Test
            </Button>
          }
        />
      ) : (
        <>
          {/* View switcher above the filter: Previous Grip History · Archived. */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button
              variant={!showArchived ? 'primary' : 'secondary'}
              leftIcon={<FiClock />}
              onClick={() => setShowArchived(false)}
            >
              Previous Grip History
            </Button>
            <Button
              variant={showArchived ? 'primary' : 'secondary'}
              leftIcon={<FiArchive />}
              onClick={() => setShowArchived(true)}
            >
              Archived
              {archivedRuns.length ? ` (${archivedRuns.length})` : ''}
            </Button>
          </div>

          <RecentFilterBar
            value={recent}
            onChange={setRecent}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />

          {filteredRuns.length === 0 ? (
            <p className="py-10 text-center text-sm text-brand-gray-900">
              {showArchived
                ? 'No archived grip tests.'
                : 'No matching records found.'}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredRuns.map((run) => (
                <motion.div
                  key={run.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="surface-card p-4 md:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-brand-black">
                        Grip Test {numberById[run.id]}
                      </p>
                      <p className="text-sm text-brand-gray-900">
                        Date: {formatDate(run.date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiEdit2 />}
                        onClick={() =>
                          navigate(`/reason-eliminator/grip-history/${run.id}`)
                        }
                      >
                        Edit
                      </Button>
                      {showArchived ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<FiRotateCcw />}
                          onClick={() => unarchiveRun(run.id)}
                        >
                          Unarchive
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<FiArchive />}
                          onClick={() => archiveRun(run.id)}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        leftIcon={<FiTrash2 />}
                        onClick={() => handleDelete(run.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiFileText />}
                        onClick={() => exportPdf(run)}
                      >
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<FiDownload />}
                        onClick={() => exportExcel(run)}
                      >
                        XLS
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </PageTransition>
  );
}
