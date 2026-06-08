import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiArrowLeft,
  FiTrendingUp,
  FiGrid,
  FiZap,
  FiFileText,
} from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Card from '@/features/reason-eliminator/components/common/Card.jsx';

// Deep Review is a new, standalone entry-point screen. It only presents
// sections as panels — it does not touch the assessment, category, subcategory,
// power word or grip test flows, state management, or storage.
const SECTIONS = [
  {
    key: 'trends',
    label: 'Trends',
    icon: <FiTrendingUp />,
    description: 'How your Reasons and grip scores change over time.',
  },
  {
    key: 'patterns',
    label: 'Patterns',
    icon: <FiGrid />,
    description: 'Recurring categories and subcategories across sessions.',
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: <FiZap />,
    description: 'Highlights and suggestions drawn from your assessments.',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: <FiFileText />,
    description: 'Exportable summaries of your progress.',
  },
];

export default function DeepReviewPage() {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Analysis"
        title="Deep Review"
        description="A focused space to review trends, patterns and insights across your assessments."
        actions={
          <Button
            variant="ghost"
            leftIcon={<FiArrowLeft />}
            onClick={() => navigate('/reason-eliminator')}
          >
            Back
          </Button>
        }
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.06, delayChildren: 0.05 },
          },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {SECTIONS.map((s) => (
          <motion.div
            key={s.key}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Card className="p-5 h-full flex items-start gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-red-soft text-brand-red text-xl shrink-0">
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-brand-black">{s.label}</p>
                <p className="mt-1 text-sm text-brand-gray-900">
                  {s.description}
                </p>
                <p className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-widest text-brand-gray-400">
                  Coming soon
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </PageTransition>
  );
}
