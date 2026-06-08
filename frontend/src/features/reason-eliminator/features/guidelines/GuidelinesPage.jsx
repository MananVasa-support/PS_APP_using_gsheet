import { motion } from 'framer-motion';
import { FiCheck, FiX } from 'react-icons/fi';
import PageHeader from '@/features/reason-eliminator/components/common/PageHeader.jsx';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Card from '@/features/reason-eliminator/components/common/Card.jsx';
import { DOS, DONTS } from './guidelines.data.js';

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.025 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

function GuidelineCard({ tone, eyebrow, title, items, icon }) {
  const isDo = tone === 'do';
  return (
    <Card className="p-5 md:p-6">
      <div className="flex items-center gap-3 mb-5">
        <span
          className={
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' +
            (isDo
              ? 'bg-brand-black text-white'
              : 'bg-brand-red-soft text-brand-red')
          }
        >
          {icon}
        </span>
        <div>
          <p
            className={
              'text-[10px] font-semibold uppercase tracking-[0.18em] ' +
              (isDo ? 'text-brand-gray-900' : 'text-brand-red')
            }
          >
            {eyebrow}
          </p>
          <h2 className="text-lg font-bold text-brand-black tracking-tight">
            {title}
          </h2>
        </div>
      </div>

      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="divide-y divide-brand-gray-100"
      >
        {items.map((text, i) => (
          <motion.li
            key={i}
            variants={itemVariants}
            className="flex items-start gap-3 py-2.5"
          >
            <span
              className={
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ' +
                (isDo
                  ? 'bg-brand-gray-100 text-brand-black'
                  : 'bg-brand-red-soft text-brand-red')
              }
            >
              {isDo ? <FiCheck size={12} /> : <FiX size={12} />}
            </span>
            <p className="text-sm leading-relaxed text-brand-gray-900">
              {text}
            </p>
          </motion.li>
        ))}
      </motion.ul>
    </Card>
  );
}

export default function GuidelinesPage() {
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Reference"
        title="Guidelines"
        description="How to get the most out of the Reason Eliminator — capture honest reasons, find the real root cause, and turn insight into action."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 items-start">
        <GuidelineCard
          tone="do"
          eyebrow="Practice these"
          title="Do's"
          icon={<FiCheck size={18} />}
          items={DOS}
        />
        <GuidelineCard
          tone="dont"
          eyebrow="Avoid these"
          title="Don'ts"
          icon={<FiX size={18} />}
          items={DONTS}
        />
      </div>
    </PageTransition>
  );
}
