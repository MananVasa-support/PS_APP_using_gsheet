import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { FaPen, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { listAssessments, updateAssessment } from '@/services/tfService';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const RECURRENCE_OPTIONS = ['Daily', 'Weekly', '10 Days', '15 Days', 'Monthly', 'Quarterly', 'Annually'];
const ACTION_OPTIONS = ['Automate', 'Delegate', 'Reduce', 'Stop'];

const fmtTime = (t) => (t ? `${t.hours || 0}h ${t.minutes || 0}m` : '0h 0m');
const toMin = (t) => (t ? (t.hours || 0) * 60 + (t.minutes || 0) : 0);
const formatMinsRounded = (m) => {
  const r = Math.round(m);
  return `${Math.floor(r / 60)}h ${r % 60}m`;
};

const normKey = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');

// Weekly usage based on recurrence + selected days (same as Time Saving Summary).
const calcWeeklyMinutes = (time, recurrence, days) => {
  const per = toMin(time);
  switch (normKey(recurrence)) {
    case 'daily':
      return per * 7;
    case 'weekly':
      return per * (days?.length || 0);
    case '10_days':
      return (per / 10) * 7;
    case '15_days':
      return (per / 15) * 7;
    case 'monthly':
      return (per / 30) * 7;
    case 'quarterly':
      return (per / 90) * 7;
    case 'annually':
      return (per / 365) * 7;
    default:
      return per;
  }
};

// Saving Type badge colors.
const ACTION_BADGE = {
  Automate: 'bg-blue-100 text-blue-600',
  Delegate: 'bg-green-100 text-green-600',
  Reduce: 'bg-orange-100 text-orange-600',
  Stop: 'bg-red-100 text-red-600',
};

// A routine row is valid only with a name, recurrence, action, and non-negative time.
const isValidRow = (r) =>
  !!r &&
  (r.name || '').trim() !== '' &&
  !!r.recurrence &&
  !!r.action &&
  (r.time?.hours || 0) >= 0 &&
  (r.time?.minutes || 0) >= 0;

export default function AssessmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  // Inline editing: only one row open at a time.
  const [editRowId, setEditRowId] = useState(null);
  const [tempEditData, setTempEditData] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    // Look in BOTH buckets so archived assessments open too.
    listAssessments()
      .then(({ active: act, archived: arch }) => {
        if (!active) return;
        setAssessment([...act, ...arch].find((a) => String(a.id) === String(id)) || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  // Persist inline routine edits to the user's account.
  const persist = (routines) => {
    setAssessment((prev) => {
      const next = { ...prev, routines };
      const { id: _id, archived: _arch, ...content } = next;
      updateAssessment(id, content).catch(() => {});
      return next;
    });
  };

  if (!assessment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6">
        <div className="text-center">
          <p className="mb-4 text-gray-500">Assessment not found.</p>
          <button
            type="button"
            onClick={() => navigate('/time-finder/previous-assessment')}
            className="rounded-lg bg-red-500 px-4 py-2 text-white"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const routinesData = assessment.routines || [];
  const assessmentDate = new Date(assessment.createdAt);
  const totalSavedMinutes = routinesData.reduce((acc, r) => acc + toMin(r.timeSaving), 0);
  const totalSavedHours = Math.floor(totalSavedMinutes / 60);
  const totalSavedRemaining = totalSavedMinutes % 60;

  const handleDeleteRow = (index) => persist(routinesData.filter((_, i) => i !== index));

  // Enter edit mode for a row (clones its data so edits stay temporary until Save).
  const startEdit = (index) => {
    const r = routinesData[index];
    setEditRowId(index);
    setTempEditData({
      ...r,
      name: r.name || '',
      recurrence: r.recurrence || '',
      action: r.action || '',
      time: { hours: r.time?.hours || 0, minutes: r.time?.minutes || 0 },
      timeSaving: { hours: r.timeSaving?.hours || 0, minutes: r.timeSaving?.minutes || 0 },
      days: r.days || [],
    });
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setTempEditData(null);
  };

  const saveEdit = (index) => {
    if (!isValidRow(tempEditData)) return;
    persist(routinesData.map((r, i) => (i === index ? tempEditData : r)));
    setEditRowId(null);
    setTempEditData(null);
    setToast('Assessment updated successfully');
    setTimeout(() => setToast(''), 2500);
  };

  // Temp-data setters (clamp times: no negatives, minutes 0–59).
  const setTemp = (patch) => setTempEditData((p) => ({ ...p, ...patch }));
  const setTempHours = (h) =>
    setTempEditData((p) => ({ ...p, time: { ...p.time, hours: Math.max(0, h || 0) } }));
  const setTempMinutes = (m) =>
    setTempEditData((p) => ({
      ...p,
      time: { ...p.time, minutes: Math.min(59, Math.max(0, m || 0)) },
    }));

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[900px]">
        <header className="mb-8 flex items-center justify-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Assessment - {assessmentDate.toLocaleDateString()}
          </h1>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-500">
            Completed
          </span>
        </header>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl bg-green-50 px-4 py-2.5 text-center text-sm font-medium text-green-700 ring-1 ring-green-200"
          >
            {toast}
          </motion.div>
        )}

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {routinesData.length === 0 ? (
            <p className="text-center text-sm text-gray-400">No routines configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="w-[5%] p-3">No.</th>
                    <th className="w-[16%] p-3">Routine</th>
                    <th className="w-[16%] p-3">Recurrence</th>
                    <th className="w-[12%] p-3">Time Per Instance</th>
                    <th className="w-[12%] p-3">Time Per Day</th>
                    <th className="w-[13%] p-3">Saving Type</th>
                    <th className="w-[12%] p-3">Time Saved (per instance)</th>
                    <th className="w-[14%] p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routinesData.map((item, index) => {
                    const editing = editRowId === index;
                    if (editing) {
                      const t = tempEditData;
                      const nameInvalid = (t.name || '').trim() === '';
                      const rowValid = isValidRow(t);
                      const inputCls =
                        'w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400';
                      return (
                        <tr
                          key={`edit-${index}`}
                          className="border-t bg-red-50/60 align-top transition-colors"
                        >
                          <td className="p-3">{index + 1}</td>
                          {/* Routine */}
                          <td className="p-3">
                            <input
                              type="text"
                              value={t.name}
                              onChange={(e) => setTemp({ name: e.target.value })}
                              placeholder="Routine name"
                              className={inputCls + (nameInvalid ? ' border-red-500' : '')}
                            />
                          </td>
                          {/* Recurrence */}
                          <td className="p-3">
                            <select
                              value={t.recurrence}
                              onChange={(e) => setTemp({ recurrence: e.target.value })}
                              className={inputCls + (!t.recurrence ? ' border-red-500' : '')}
                            >
                              <option value="">Select</option>
                              {RECURRENCE_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Time Per Instance */}
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={t.time.hours}
                                onChange={(e) => setTempHours(Number(e.target.value))}
                                className="w-12 rounded-md border px-1.5 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                              <span className="text-xs text-gray-500">h</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={t.time.minutes}
                                onChange={(e) => setTempMinutes(Number(e.target.value))}
                                className="w-12 rounded-md border px-1.5 py-1.5 text-center text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                              />
                              <span className="text-xs text-gray-500">m</span>
                            </div>
                          </td>
                          {/* Time Per Day (auto-calculated, live) */}
                          <td className="p-3 tabular-nums text-gray-500">
                            {formatMinsRounded(
                              calcWeeklyMinutes(t.time, t.recurrence, t.days) / 7
                            )}
                          </td>
                          {/* Saving Type */}
                          <td className="p-3">
                            <select
                              value={t.action}
                              onChange={(e) => setTemp({ action: e.target.value })}
                              className={inputCls + (!t.action ? ' border-red-500' : '')}
                            >
                              <option value="">Select</option>
                              {ACTION_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Time Saved (read-only) */}
                          <td className="p-3 tabular-nums text-gray-500">{fmtTime(t.timeSaving)}</td>
                          {/* Save / Cancel */}
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => saveEdit(index)}
                              disabled={!rowValid}
                              title="Save"
                              aria-label="Save"
                              className={
                                'mr-3 transition-transform hover:scale-110 ' +
                                (rowValid
                                  ? 'text-green-600'
                                  : 'cursor-not-allowed text-gray-300')
                              }
                            >
                              <FaCheck />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              title="Cancel"
                              aria-label="Cancel"
                              className="text-red-500 transition-transform hover:scale-110"
                            >
                              <FaTimes />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`${item.name}-${index}`} className="border-t align-top transition-colors">
                        <td className="p-3">{index + 1}</td>
                        <td className="break-words p-3">{item.name}</td>
                        <td className="break-words p-3">
                          {item.recurrence || '-'}
                          {item.recurrence === 'Weekly' && item.days?.length > 0 && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({item.days.join(', ')})
                            </span>
                          )}
                        </td>
                        <td className="p-3 tabular-nums">{fmtTime(item.time)}</td>
                        <td className="p-3 tabular-nums">
                          {formatMinsRounded(
                            calcWeeklyMinutes(item.time, item.recurrence, item.days) / 7
                          )}
                        </td>
                        <td className="p-3">
                          {item.action ? (
                            <span
                              className={
                                'inline-block rounded-full px-2.5 py-1 text-xs font-medium ' +
                                (ACTION_BADGE[item.action] || 'bg-gray-100 text-gray-600')
                              }
                            >
                              {item.action}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 tabular-nums">{fmtTime(item.timeSaving)}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => startEdit(index)}
                            title="Edit"
                            aria-label="Edit"
                            className="mr-3 text-gray-600 transition-transform hover:scale-110"
                          >
                            <FaPen />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
                            title="Delete"
                            aria-label="Delete"
                            className="text-red-500 transition-transform hover:scale-110"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total time saved */}
        {routinesData.length > 0 && (
          <div className="mt-4 flex justify-end text-lg font-semibold">
            Total Time Saved: {totalSavedHours}h {totalSavedRemaining}m
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600"
          >
            Back
          </motion.button>
        </div>
      </div>
    </div>
  );
}
