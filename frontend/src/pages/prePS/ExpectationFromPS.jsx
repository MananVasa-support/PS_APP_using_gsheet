import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiTarget } from 'react-icons/fi';
import { Button, Card, PageHeader } from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { MANDATORY_MSG, isEmptyValue } from '@/utils/validation';

const AREAS = ['Professional', 'Personal'];

export default function ExpectationFromPS() {
  const toast = useToast();
  const navigate = useNavigate();
  const [, setSaved] = useLocalStorage('ta_pre_ps_expectations', []);
  const [area, setArea] = useState('');
  const [accomplish, setAccomplish] = useState('');
  const [errors, setErrors] = useState({});

  const isComplete = !!area && !isEmptyValue(accomplish);

  function handleSave(e) {
    e.preventDefault();
    const next = {};
    if (!area) next.area = 'Pick an area';
    if (!accomplish.trim()) next.accomplish = 'Please describe what you want to accomplish';
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(MANDATORY_MSG);
      return;
    }

    setSaved((list) => [
      { id: `exp_${Date.now()}`, area, accomplish: accomplish.trim(), createdAt: new Date().toISOString() },
      ...list,
    ].slice(0, 100));
    toast.success('Expectation saved');
    navigate('/pre-ps');
  }

  return (
    <div className="space-y-6">
      <Button as={Link} to="/pre-ps" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader title="Expectation From PS" subtitle="Set your intent before the session" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Area */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Area <span className="text-brand-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((o) => {
                  const active = area === o;
                  return (
                    <button
                      type="button"
                      key={o}
                      onClick={() => setArea(o)}
                      className={cn(
                        'rounded-xl border px-4 py-2 text-sm font-medium transition',
                        active
                          ? 'border-transparent bg-brand-gradient text-white shadow-glow'
                          : 'border-ink-700 bg-ink-800 text-slate-300 hover:border-brand-500/50 hover:text-white'
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {errors.area && <p className="mt-1.5 text-xs text-brand-400">{errors.area}</p>}
            </div>

            {/* Accomplish */}
            <div>
              <label htmlFor="accomplish" className="mb-1.5 block text-sm font-medium text-slate-300">
                What do I want to accomplish out of participating? <span className="text-brand-400">*</span>
              </label>
              <textarea
                id="accomplish"
                value={accomplish}
                onChange={(e) => setAccomplish(e.target.value)}
                placeholder="Type your answer…"
                className={cn(
                  'input-base min-h-[180px] resize-y',
                  errors.accomplish && 'border-brand-500'
                )}
              />
              {errors.accomplish && <p className="mt-1.5 text-xs text-brand-400">{errors.accomplish}</p>}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button as={Link} to="/pre-ps" type="button" variant="ghost" icon={FiArrowLeft}>
                Back
              </Button>
              <Button type="submit" icon={FiSave} disabled={!isComplete}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
