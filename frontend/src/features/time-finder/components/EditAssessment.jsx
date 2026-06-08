import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const fmtTime = (t) => (t ? `${t.hours || 0}h ${t.minutes || 0}m` : '—');

function loadEdit() {
  try {
    return JSON.parse(localStorage.getItem('editAssessment')) || null;
  } catch {
    return null;
  }
}

export default function EditAssessment() {
  const navigate = useNavigate();
  const [assessment] = useState(loadEdit);

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[760px]">
        <h1 className="mb-6 text-center text-3xl font-bold text-black">Edit Assessment</h1>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {!assessment ? (
            <p className="text-center text-sm text-gray-400">No assessment selected.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                {new Date(assessment.createdAt).toLocaleString()} · Total saved:{' '}
                <span className="font-semibold text-red-500">{assessment.totalTimeSaved}</span>
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-3">No.</th>
                      <th className="p-3">Routine</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Recurrence</th>
                      <th className="p-3">Time</th>
                      <th className="p-3">Time Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(assessment.routines || []).map((r, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">{r.name}</td>
                        <td className="p-3">{r.category}</td>
                        <td className="p-3">{r.recurrence || '-'}</td>
                        <td className="p-3 tabular-nums">{fmtTime(r.time)}</td>
                        <td className="p-3 tabular-nums">{fmtTime(r.timeSaving)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate('/time-finder/previous-assessment')}
            className="rounded-xl bg-red-500 px-7 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-600"
          >
            Back
          </motion.button>
        </div>
      </div>
    </div>
  );
}
