import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiCompass, FiPlus } from 'react-icons/fi';
import { BackButton, Button, Card, PageHeader } from '@/components/ui';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { AutoAddSelect, Field } from '@/components/ps/fields.jsx';
import { useLog } from '@/components/ps/useLog.js';
import { getOptionList, addToOptionList, EXPECTATION_AREAS } from '@/services/personalSpaceService';

const ACCOMPLISH_LABEL = 'What Do I want to Accomplish out of Participating in the Workshop';

/**
 * Expectations Crystalliser — main tool page. Participants lock in the outcomes
 * they want from the workshop (Area + Accomplishment). Rating & reflection on
 * each outcome happens on the "My Expectations" page (end of the workshop).
 */
export default function ExpectationsCrystalliser() {
  const toast = useToast();
  const navigate = useNavigate();
  const { add } = useLog('expectations-crystalliser', (d) => `${d.area}: ${d.accomplishment}`);

  const [areas, setAreas] = useState(EXPECTATION_AREAS);
  const [area, setArea] = useState('');
  const [accomplishment, setAccomplishment] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getOptionList('expectations_areas', EXPECTATION_AREAS).then(setAreas).catch(() => {});
  }, []);

  async function addOutcome(e) {
    e.preventDefault();
    const errs = {};
    if (!area.trim()) errs.area = 'Pick or add an area';
    if (!accomplishment.trim()) errs.accomplishment = 'Describe what you want to accomplish';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const updated = await addToOptionList('expectations_areas', area.trim(), areas);
    setAreas(updated);
    await add({ area: area.trim(), accomplishment: accomplishment.trim(), rating: 0, notes: '' });
    setArea('');
    setAccomplishment('');
    toast.success('Expectation added');
  }

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/dashboard')} />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <FiCompass className="h-5 w-5" />
            </span>
            Expectations Crystalliser ©
          </span>
        }
        subtitle="Lock in the outcomes you want from the workshop — rate & reflect on each at the end."
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={addOutcome} className="space-y-5">
            <AutoAddSelect
              label="Area / Category"
              required
              value={area}
              options={areas}
              placeholder="Pick or type an area"
              onChange={setArea}
              error={errors.area}
            />
            <Field label={ACCOMPLISH_LABEL} required error={errors.accomplishment}>
              <textarea
                value={accomplishment}
                onChange={(e) => setAccomplishment(e.target.value)}
                placeholder="What does success look like for this area?"
                className={cn('input-base min-h-[90px] resize-y', errors.accomplishment && 'border-brand-500')}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2 border-t border-ink-800 pt-5">
              <Button type="button" variant="outline" onClick={() => navigate('/expectations-crystalliser/my-expectations')}>
                View My Expectations
              </Button>
              <Button type="submit" icon={FiPlus}>Add Expectation</Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
