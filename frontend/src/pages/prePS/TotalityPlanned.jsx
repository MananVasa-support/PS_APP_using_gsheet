import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BackButton, PageHeader } from '@/components/ui';
import TotalityTaskList from './TotalityTaskList.jsx';

export default function TotalityPlanned() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/pre-ps/totality')} />
      <PageHeader title="Scheduled Tasks" subtitle="Tasks you've moved into a Power Planner week." />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <TotalityTaskList filter="planned" emptyText="No tasks scheduled yet — use “Move to Power Planner” on a task." />
      </motion.div>
    </div>
  );
}
