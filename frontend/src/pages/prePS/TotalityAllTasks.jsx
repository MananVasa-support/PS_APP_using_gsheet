import { motion } from 'framer-motion';
import { PageHeader } from '@/components/ui';
import TotalityTaskList from './TotalityTaskList.jsx';

export default function TotalityAllTasks() {
  return (
    <div className="space-y-6">
      <PageHeader title="All Tasks" subtitle="Every task captured in Totality Collector." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <TotalityTaskList filter="all" emptyText="No tasks yet — add one from Totality Collector." />
      </motion.div>
    </div>
  );
}
