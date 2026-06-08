import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiTrendingUp } from 'react-icons/fi';
import { Button, Card, PageHeader } from '@/components/ui';

export default function SalesCultivator() {
  return (
    <div className="space-y-6">
      <Button as={Link} to="/dashboard" variant="ghost" size="sm" icon={FiArrowLeft} className="-ml-2">
        Back
      </Button>

      <PageHeader title="Sales Cultivator" subtitle="Grow your pipeline and nurture conversions." />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card>
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <FiTrendingUp className="h-7 w-7" />
            </span>
            <p className="text-lg font-semibold text-white">Sales Cultivator</p>
            <p className="max-w-md text-sm text-ink-400">
              Track leads, opportunities and sales cadences. Module coming soon.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
