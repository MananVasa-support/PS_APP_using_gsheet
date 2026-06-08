import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';
import { FiCopy, FiCornerUpLeft, FiDownload, FiFileText } from 'react-icons/fi';
import { exportExcel, exportPdf } from '../utils/exportUtils.js';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

export default function ArchivedAssessments() {
  const navigate = useNavigate();
  const [archived, setArchived] = useState([]);

  useEffect(() => {
    try {
      setArchived(JSON.parse(localStorage.getItem('archivedAssessments')) || []);
    } catch {
      setArchived([]);
    }
  }, []);

  const persistArchived = (list) => {
    setArchived(list);
    localStorage.setItem('archivedAssessments', JSON.stringify(list));
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    persistArchived(archived.filter((a) => a.id !== id));
  };

  const handleClearAll = () => {
    localStorage.removeItem('archivedAssessments');
    setArchived([]);
  };

  const handleDuplicate = (a) => {
    const copy = { ...a, id: Date.now(), createdAt: new Date().toISOString() };
    persistArchived([...archived, copy]);
  };

  // Move an assessment back into "Previous Assessments".
  const handleUnarchive = (a) => {
    persistArchived(archived.filter((x) => x.id !== a.id));
    let active = [];
    try {
      active = JSON.parse(localStorage.getItem('assessments')) || [];
    } catch {
      active = [];
    }
    localStorage.setItem('assessments', JSON.stringify([...active, a]));
  };

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[760px]">
        {/* Header + Clear All */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-black">Archived Assessments</h1>
          {archived.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-red-600"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Card list (scrollable if many records) */}
        {archived.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-lg ring-1 ring-black/5">
            No archived assessments
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {archived.map((a) => {
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
                      <h3 className="text-base font-semibold text-black">
                        Assessment - {date.toLocaleDateString()}
                      </h3>
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
                      <button
                        type="button"
                        onClick={() => handleUnarchive(a)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <FiCornerUpLeft /> Unarchive
                      </button>
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
