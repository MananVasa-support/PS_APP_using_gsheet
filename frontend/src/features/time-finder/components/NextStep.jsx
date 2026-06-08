import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

export default function NextStep() {
  const navigate = useNavigate();
  const { state } = useLocation(); // selection passed from /select-routines (optional)
  const selectedRoutines = state?.selectedRoutines || [];

  return (
    <div className="flex min-h-screen justify-center bg-gradient-to-b from-white to-gray-100 px-6 py-12">
      <div className="w-full max-w-[700px]">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black">TIME FINDER ©</h1>
          <p className="mt-1 text-sm text-gray-500">Step 2</p>
        </header>

        <div className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
          {selectedRoutines.length > 0 && (
            <p className="text-sm text-gray-500">
              {selectedRoutines.length} routine{selectedRoutines.length === 1 ? '' : 's'} carried
              over from the previous step.
            </p>
          )}

          {/* Recurrence (placeholder) */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-black">Recurrence</h2>
            <div className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-400">
              Recurrence options go here.
            </div>
          </section>

          {/* Time per Instance (placeholder) */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-black">Time per Instance</h2>
            <div className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-400">
              Time input goes here.
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <motion.button
            {...press}
            type="button"
            onClick={() => navigate('/time-finder/select-routines')}
            className="rounded-xl border border-gray-300 bg-white px-7 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Back
          </motion.button>
        </div>
      </div>
    </div>
  );
}
