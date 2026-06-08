import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';
import { FiCopy, FiArchive, FiCornerUpLeft, FiDownload, FiFileText } from 'react-icons/fi';
import { exportExcel, exportPdf } from '../utils/exportUtils.js';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const FILTER_OPTIONS = ['Daily', 'Weekly', '10 Days', '15 Days', 'Monthly', 'Quarterly', 'Annually'];

// Display title: stored title if present, else derived from the date.
const titleOf = (a) => a.title || `Assessment - ${new Date(a.createdAt).toLocaleDateString()}`;

export default function PreviousAssessment() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    try {
      setAssessments(JSON.parse(localStorage.getItem('assessments')) || []);
    } catch {
      setAssessments([]);
    }
    try {
      setArchived(JSON.parse(localStorage.getItem('archivedAssessments')) || []);
    } catch {
      setArchived([]);
    }
  }, []);

  const persistActive = (list) => {
    setAssessments(list);
    localStorage.setItem('assessments', JSON.stringify(list));
  };
  const persistArchived = (list) => {
    setArchived(list);
    localStorage.setItem('archivedAssessments', JSON.stringify(list));
  };

  // Move between the two lists.
  const handleArchive = (a) => {
    persistActive(assessments.filter((x) => x.id !== a.id));
    persistArchived([...archived, a]);
  };
  const handleUnarchive = (a) => {
    persistArchived(archived.filter((x) => x.id !== a.id));
    persistActive([...assessments, a]);
  };

  // Context-aware actions (operate on whichever list is shown).
  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this assessment?')) return;
    if (showArchived) persistArchived(archived.filter((a) => a.id !== id));
    else persistActive(assessments.filter((a) => a.id !== id));
  };
  const handleClearAll = () => {
    if (showArchived) {
      localStorage.removeItem('archivedAssessments');
      setArchived([]);
    } else {
      localStorage.removeItem('assessments');
      setAssessments([]);
    }
  };
  // Count existing copies of a base title in the list (returns next copy number).
  const getCopyCount = (base, list) => {
    const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escaped} \\(Copy( \\d+)?\\)$`);
    return list.filter((x) => re.test(titleOf(x))).length + 1;
  };

  const handleDuplicate = (a) => {
    const list = showArchived ? archived : assessments;
    const base = titleOf(a).replace(/\s*\(Copy.*\)$/, ''); // strip any existing "(Copy)" suffix
    const copyCount = getCopyCount(base, list);
    const newTitle = copyCount === 1 ? `${base} (Copy)` : `${base} (Copy ${copyCount})`;
    // New object (spread, no mutation), new unique id + current timestamp, added at TOP.
    const copy = { ...a, id: Date.now(), title: newTitle, createdAt: new Date().toISOString() };
    if (showArchived) persistArchived([copy, ...archived]);
    else persistActive([copy, ...assessments]);
  };

  const sourceList = showArchived ? archived : assessments;
  const visible = sourceList
    .filter((a) => !filter || (a.routines || []).some((r) => r.recurrence === filter))
    // Newest first — sort by createdAt descending (works after refresh too).
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[760px]">
        {/* Header + Clear All */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            {showArchived ? 'Archived Assessments' : 'Previous Assessments'}
          </h1>
          {sourceList.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-red-600"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Archived toggle + Filter */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-red-600"
          >
            {showArchived ? (
              'Previous Assessments'
            ) : (
              <>
                Archived
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-red-500">
                  {archived.length}
                </span>
              </>
            )}
          </button>
          {sourceList.length > 0 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 transition focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            >
              <option value="">Filter</option>
              {FILTER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Card list */}
        {sourceList.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-lg ring-1 ring-black/5">
            {showArchived ? 'No archived assessments' : 'No previous assessments found'}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-lg ring-1 ring-black/5">
            No matching assessments
          </div>
        ) : (
          <div className={'space-y-4 ' + (showArchived ? 'max-h-[70vh] overflow-y-auto pr-1' : '')}>
            {visible.map((a) => {
              const date = new Date(a.createdAt);
              return (
                <motion.div
                  key={a.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => navigate(`/time-finder/assessment/${a.id}`)}
                  className="flex cursor-pointer items-start justify-between rounded-2xl bg-white p-5 shadow-md ring-1 ring-black/5 transition hover:shadow-lg"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-black">{titleOf(a)}</h3>
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
                        Completed
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {a.routines?.length || 0} routines • Saved {a.totalTimeSaved || '0h 0m'}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {date.toLocaleDateString()}{' '}
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* Action buttons */}
                    <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(a)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <FiCopy /> Duplicate
                      </button>
                      {showArchived ? (
                        <button
                          type="button"
                          onClick={() => handleUnarchive(a)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <FiCornerUpLeft /> Unarchive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleArchive(a)}
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <FiArchive /> Archive
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => exportExcel(a)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <FiDownload /> Excel Export
                      </button>
                      <button
                        type="button"
                        onClick={() => exportPdf(a)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <FiFileText /> PDF Export
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(a.id, e)}
                    title="Delete"
                    aria-label="Delete assessment"
                    className="text-red-500 transition-transform hover:scale-110"
                  >
                    <FaTrash />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Home */}
        <div className="mt-6 flex justify-end">
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate('/time-finder/')}
            className="rounded-xl bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600"
          >
            Home
          </motion.button>
        </div>
      </div>
    </div>
  );
}
