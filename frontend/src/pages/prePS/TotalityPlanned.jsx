import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui';
import TotalityTaskList from './TotalityTaskList.jsx';

export default function TotalityPlanned() {
  return (
    <div className="space-y-6">
      <PageHeader title="Scheduled Tasks" subtitle="Tasks you've moved into a Power Planner week." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <TotalityTaskList filter="planned" emptyText="No tasks scheduled yet — use “Move to Power Planner” on a task." />
      </motion.div>
    </div>
  );
}
