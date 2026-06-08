import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaPen, FaTrash } from 'react-icons/fa';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const fmtTime = (time) => {
  if (!time) return '—';
  const { hours = 0, minutes = 0 } = time;
  return `${hours}h ${minutes}m`;
};

const normKey = (s) => (s || '').toLowerCase().replace(/\s+/g, '_'); // "10 Days" -> "10_days"

// Saving Type badge colors.
const ACTION_BADGE = {
  Automate: 'bg-blue-100 text-blue-600',
  Delegate: 'bg-green-100 text-green-600',
  Reduce: 'bg-orange-100 text-orange-600',
  Stop: 'bg-red-100 text-red-600',
};

// Rounded formatter (for fractional daily averages, e.g. 51.4 -> "0h 51m").
const formatMinsRounded = (min) => {
  const r = Math.round(min);
  return `${Math.floor(r / 60)}h ${r % 60}m`;
};

// Weekly usage based on recurrence + selected days.
const calcWeeklyMinutes = (time, recurrence, days) => {
  const per = (time?.hours || 0) * 60 + (time?.minutes || 0);
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

export default function SavingTime() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Use the data passed from Align; if a refresh wiped router state, recover the
  // last working copy from localStorage so the summary (and save) still has data.
  let recovered = [];
  try {
    recovered = JSON.parse(localStorage.getItem('currentAssessment')) || [];
  } catch {
    recovered = [];
  }
  const [routinesData, setRoutinesData] = useState(state?.routinesData || recovered);

  // Persist the working copy whenever we arrive here with fresh data.
  useEffect(() => {
    if (state?.routinesData?.length) {
      setRoutinesData(state.routinesData);
      localStorage.setItem('currentAssessment', JSON.stringify(state.routinesData));
    }
  }, [state]);

  // Delete one routine from the summary list.
  const handleDeleteRow = (index) => {
    setRoutinesData((prev) => prev.filter((_, i) => i !== index));
  };

  // Edit one routine → re-enter the recurrence flow at that routine.
  const handleEditRow = (index) => {
    navigate('/time-finder/recurrence', { state: { routines: routinesData, startIndex: index } });
  };

  // Sum the entered "Time Saved" (reduced time) across all routines.
  const totalSavedMinutes = routinesData.reduce(
    (acc, r) => acc + ((r.timeSaving?.hours || 0) * 60 + (r.timeSaving?.minutes || 0)),
    0
  );
  const totalSavedHours = Math.floor(totalSavedMinutes / 60);
  const totalSavedRemaining = totalSavedMinutes % 60;

  // Validation: total ACTUAL time per day must not exceed 24h (1440 min).
  const totalTimeMinutes = routinesData.reduce(
    (acc, r) => acc + ((r.time?.hours || 0) * 60 + (r.time?.minutes || 0)),
    0
  );
  const isExceeded = totalTimeMinutes > 1440;

  // Save this assessment to localStorage, then show it in the history table.
  const handleEnd = () => {
    if (routinesData.length === 0) {
      alert('No routine data to save. Please complete an assessment first.');
      navigate('/time-finder/');
      return;
    }
    if (isExceeded) return; // over the 24h daily limit — block submit
    const newAssessment = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      routines: routinesData,
      totalTimeSaved: `${totalSavedHours}h ${totalSavedRemaining}m`,
    };
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem('assessments')) || [];
    } catch {
      existing = [];
    }
    // Insert newest at the beginning so it shows at the top of Previous Assessments.
    localStorage.setItem('assessments', JSON.stringify([newAssessment, ...existing]));
    localStorage.removeItem('currentAssessment'); // clear the working draft
    navigate('/time-finder/previous-assessment'); // save, then show it in the history table
  };

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[900px]">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black">Time Saving Summary</h1>
        </header>

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
                  {routinesData.map((item, index) => (
                    <tr key={item.name} className="border-t align-top">
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
                          onClick={() => handleEditRow(index)}
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
                  ))}
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


        {/* Daily limit warning */}
        {isExceeded && (
          <div className="mt-2 text-right font-semibold text-red-500">
            You are exceeding your daily time limit
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600"
          >
            Back
          </motion.button>
          <motion.button
            {...press}
            type="button"
            onClick={handleEnd}
            disabled={isExceeded}
            className={
              'rounded-xl bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600 ' +
              (isExceeded ? 'cursor-not-allowed opacity-50' : '')
            }
          >
            End
          </motion.button>
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate('/time-finder/previous-assessment')}
            className="rounded-xl bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600"
          >
            Previous Assessment
          </motion.button>
        </div>
      </div>
    </div>
  );
}
