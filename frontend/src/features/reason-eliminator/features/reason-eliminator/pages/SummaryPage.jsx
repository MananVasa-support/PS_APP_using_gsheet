import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiEye, FiClock, FiGrid } from 'react-icons/fi';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import Card from '@/features/reason-eliminator/components/common/Card.jsx';
import ReasonsTable from '../components/ReasonsTable.jsx';
import { SESSION_STATUS } from '../constants.js';
import { visibleAssessmentReasons } from '../utils/reasonVisibility.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';

export default function SummaryPage() {
  const navigate = useNavigate();
  const { reasons, hasActiveSession, persist, reset, setStatus } =
    useAssessmentFlow();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (hasActiveSession && reasons.length > 0) {
      setStatus(SESSION_STATUS.COMPLETED);
      persist({ status: SESSION_STATUS.COMPLETED });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hasActiveSession) {
    return <Navigate to="/reason-eliminator" replace />;
  }

  const handleNewSession = () => {
    reset();
    navigate('/reason-eliminator');
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        {!revealed ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
              Assessment Complete
            </h1>
            <p className="mt-2 text-sm text-brand-gray-900 max-w-md mx-auto">
              All your Reasons, Categories and Power Words have been saved.
            </p>

            <Card className="mt-8 p-8">
              <p className="text-sm text-brand-gray-900 mb-5">
                Tap the button below to reveal your Full Assessment.
              </p>
              <Button
                size="lg"
                leftIcon={<FiEye />}
                onClick={() => setRevealed(true)}
              >
                View Full Assessment
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-brand-black tracking-tight">
                  Full Assessment
                </h1>
                <p className="mt-1 text-sm text-brand-gray-900">
                  Date, Reason, Category and Power Word for every entry.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  leftIcon={<FiClock />}
                  onClick={() => navigate('/reason-eliminator/previous')}
                >
                  View Previous Assessment
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<FiGrid />}
                  onClick={() => navigate('/reason-eliminator/dashboard')}
                >
                  Dashboard
                </Button>
              </div>
            </div>

            <ReasonsTable
              reasons={visibleAssessmentReasons(reasons)}
              showCategory
              showSubcategory
              showPowerWord
            />
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
