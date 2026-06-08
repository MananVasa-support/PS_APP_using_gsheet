import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiClipboard } from 'react-icons/fi';
import { Button, Card, PageHeader } from '@/components/ui';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/context/ToastContext.jsx';
import { cn } from '@/utils/cn';
import { MANDATORY_MSG, isEmptyValue } from '@/utils/validation';

export default function PostPS() {
  const toast = useToast();
  const [, setSaved] = useLocalStorage('ta_post_ps_notes', []);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const isComplete = !isEmptyValue(notes);

  function handleSave(e) {
    e.preventDefault();
    if (!notes.trim()) {
      setError(MANDATORY_MSG);
      toast.error(MANDATORY_MSG);
      return;
    }
    setError('');
    setSaved((list) => [
      { id: `post_${Date.now()}`, notes: notes.trim(), createdAt: new Date().toISOString() },
      ...list,
    ].slice(0, 100));
    setNotes('');
    toast.success('Post PS notes saved');
  }

  return (
    <div className="space-y-6">
      <Button as={Link} to="/home" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader title="Post PS" subtitle="Wrap up after your problem-solving session" />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl bg-brand-500/10 p-4 ring-1 ring-brand-500/20">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-white">
                <FiClipboard className="h-4 w-4" />
              </span>
              <p className="text-sm text-slate-300">
                Capture your reflections, takeaways and follow-ups from the PS session.
              </p>
            </div>

            <div>
              <label htmlFor="postNotes" className="mb-1.5 block text-sm font-medium text-slate-300">
                Notes <span className="text-brand-400">*</span>
              </label>
              <textarea
                id="postNotes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (error) setError('');
                }}
                placeholder="What did you learn? What's next?"
                className={cn('input-base min-h-[200px] resize-y', error && 'border-brand-500')}
              />
              {error && <p className="mt-1.5 text-xs text-brand-400">{error}</p>}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button as={Link} to="/home" type="button" variant="ghost" icon={FiArrowLeft}>
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
