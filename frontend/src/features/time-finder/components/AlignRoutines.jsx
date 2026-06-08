import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

const ACTIONS = ['Automate', 'Delegate', 'Reduce', 'Stop'];

// Convert {hours, minutes} to total minutes for accurate comparison.
const toMin = (t) => (t ? (t.hours || 0) * 60 + (t.minutes || 0) : 0);
const fmtMins = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function AlignRoutines() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const incoming = state?.routinesData || [];

  // Augment each routine with action / assignedTo / timeSaving.
  const [data, setData] = useState(() =>
    incoming.map((r) => ({
      ...r,
      action: r.action || '',
      assignedTo: r.assignedTo || '',
      timeSaving: r.timeSaving || { hours: 0, minutes: 0 },
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  if (data.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-100 px-6">
        <div className="text-center">
          <p className="mb-4 text-gray-500">No routines to align.</p>
          <button
            type="button"
            onClick={() => navigate('/time-finder/select-routines')}
            className="rounded-lg bg-red-500 px-4 py-2 text-white"
          >
            Back to Routines
          </button>
        </div>
      </div>
    );
  }

  const current = data[currentIndex];
  const isLast = currentIndex === data.length - 1;

  const updateCurrent = (patch) =>
    setData((prev) => prev.map((item, i) => (i === currentIndex ? { ...item, ...patch } : item)));

  const setSaveHours = (h) =>
    updateCurrent({ timeSaving: { ...current.timeSaving, hours: Math.max(0, h) } });
  const setSaveMinutes = (m) =>
    updateCurrent({ timeSaving: { ...current.timeSaving, minutes: Math.min(59, Math.max(0, m)) } });

  // Delegate / Automate / Stop auto-fill Possible Time Saving = Time per instance.
  // Reduce clears it for manual entry.
  const handleActionChange = (action) => {
    if (action === 'Delegate' || action === 'Automate' || action === 'Stop') {
      updateCurrent({
        action,
        timeSaving: { hours: current.time?.hours || 0, minutes: current.time?.minutes || 0 },
      });
    } else {
      updateCurrent({ action, timeSaving: { hours: 0, minutes: 0 } });
    }
  };

  // Inputs are locked until an action (Automate/Delegate/Reduce/Stop) is selected.
  const hasAction = !!current.action;
  const savingLocked = !hasAction;

  // Saving must be a positive value, no greater than Time per Instance.
  const maxMin = toMin(current.time);
  const savingMin = toMin(current.timeSaving);
  const savingExceeds = savingMin > maxMin;
  const savingEmpty = savingMin <= 0;
  const savingValid = hasAction && !savingExceeds && !savingEmpty;

  const finish = () => navigate('/time-finder/saving-time', { state: { routinesData: data } });

  const goNext = () => {
    if (!hasAction) {
      alert('Please select an option (Automate, Delegate, Reduce, or Stop) to continue.');
      return;
    }
    if (savingExceeds) {
      alert('Invalid input: Time saving cannot be greater than Time Per Instance.');
      return;
    }
    if (savingEmpty) {
      alert('Please enter a Possible Time Saving value to continue.');
      return;
    }
    if (isLast) finish();
    else setCurrentIndex(currentIndex + 1);
  };

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[700px]">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Time to Alter Your Routines
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentIndex + 1} of {data.length}
          </p>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {/* Current routine */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="font-semibold">
              {current.name}
              <span className="ml-2 text-sm text-gray-500">({current.category})</span>
            </h3>
            {(current.time?.hours > 0 || current.time?.minutes > 0) && (
              <span className="text-sm font-medium text-red-500">
                | Time per Instance: {current.time?.hours || 0}h {current.time?.minutes || 0}m
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((act) => {
              const active = current.action === act;
              return (
                <button
                  key={act}
                  type="button"
                  onClick={() => handleActionChange(act)}
                  className={
                    'rounded-full border px-4 py-2 transition-colors ' +
                    (active
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400')
                  }
                >
                  {act}
                </button>
              );
            })}
          </div>

          {/* Assigned name — only shown when Delegate is selected */}
          {current.action === 'Delegate' && (
            <div className="mt-4">
              <label className="mb-2 block text-sm">Insert Name</label>
              <input
                type="text"
                value={current.assignedTo}
                onChange={(e) => updateCurrent({ assignedTo: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          )}

          {/* Possible time saving */}
          <div className="mt-4">
            <label className="mb-2 block text-sm">Possible Time Saving</label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={current.timeSaving.hours}
                  onChange={(e) => setSaveHours(Number(e.target.value))}
                  disabled={savingLocked}
                  className={
                    'w-16 rounded-lg border px-2 py-2 text-center focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 ' +
                    (savingExceeds && !savingLocked
                      ? 'border-red-500 ring-red-300 focus:ring-red-400'
                      : 'focus:ring-red-400')
                  }
                />
                <span className="text-gray-600">h</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={current.timeSaving.minutes}
                  onChange={(e) => setSaveMinutes(Number(e.target.value))}
                  disabled={savingLocked}
                  className={
                    'w-16 rounded-lg border px-2 py-2 text-center focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100 ' +
                    (savingExceeds && !savingLocked
                      ? 'border-red-500 ring-red-300 focus:ring-red-400'
                      : 'focus:ring-red-400')
                  }
                />
                <span className="text-gray-600">m</span>
              </div>
            </div>
            {/* Helper text: max allowed */}
            {hasAction && (
              <p className="mt-1.5 text-xs text-gray-500">Max allowed: {fmtMins(maxMin)}</p>
            )}
          </div>

          {/* Validation messages */}
          {!hasAction ? (
            <p className="mt-4 text-sm font-medium text-red-500">
              Please select an option above to continue
            </p>
          ) : savingExceeds ? (
            <p className="mt-4 text-sm font-medium text-red-500">
              Invalid input: Time saving cannot be greater than Time Per Instance
            </p>
          ) : savingEmpty ? (
            <p className="mt-4 text-sm font-medium text-red-500">
              Please enter a Possible Time Saving value to continue
            </p>
          ) : null}

          {/* Navigation */}
          <div className="mt-3 flex justify-between">
            <motion.button
              {...press}
              type="button"
              onClick={finish}
              className="rounded-lg border px-4 py-2"
            >
              End Assessment
            </motion.button>
            <motion.button
              {...press}
              type="button"
              onClick={goNext}
              disabled={!savingValid}
              className={
                'rounded-lg bg-red-500 px-4 py-2 text-white transition-opacity ' +
                (savingValid ? 'hover:bg-red-600' : 'cursor-not-allowed opacity-50')
              }
            >
              {isLast ? 'Submit' : 'Next'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
