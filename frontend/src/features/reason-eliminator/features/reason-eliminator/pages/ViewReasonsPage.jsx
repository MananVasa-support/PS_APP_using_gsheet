import { useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { FiPlus, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import PageTransition from '@/features/reason-eliminator/components/layout/PageTransition.jsx';
import Button from '@/features/reason-eliminator/components/common/Button.jsx';
import EmptyState from '@/features/reason-eliminator/components/common/EmptyState.jsx';
import ReasonsTable from '../components/ReasonsTable.jsx';
import { reasonsSignature } from '../utils/formatters.js';
import { useAssessmentFlow } from '../context/AssessmentFlowContext.jsx';
import reasonEliminatorService from '../services/reasonEliminatorService.js';

export default function ViewReasonsPage() {
  const navigate = useNavigate();
  const {
    reasons,
    sessionId,
    hasActiveSession,
    updateReasonText,
    removeReason,
    archiveReason,
    unarchiveReason,
    persist,
    flowReturn,
    clearFlowReturn,
  } = useAssessmentFlow();

  // Delete a reason. The context reducer renumbers the remaining reasons
  // sequentially (keeping each reason's data attached). If this session was
  // already saved, mirror the renumbered list into storage so its R-numbers
  // stay gap-free in Previous Assessments too.
  const handleDelete = (id) => {
    removeReason(id);
    if (sessionId && reasonEliminatorService.getSession(sessionId)) {
      const next = reasons
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, index: i, seq: i + 1 }));
      persist({ reasons: next });
    }
  };

  // If the user arrived here via "Previous" from a flow step and hasn't
  // changed any reason (same signature), we can resume that exact step instead
  // of re-running the assessment. Any add/edit/delete changes the signature.
  const currentSignature = useMemo(() => reasonsSignature(reasons), [reasons]);
  const canResume =
    flowReturn && flowReturn.signature === currentSignature;

  const handleForward = () => {
    if (canResume) {
      navigate(flowReturn.step);
    } else {
      clearFlowReturn();
      navigate('/reason-eliminator/assess');
    }
  };

  // Active reasons drive the numbered list and the assessment flow; archived
  // reasons keep all their saved data (category, subcategory, power word, grip
  // score) and live in their own section below — never re-asked.
  const activeReasons = reasons.filter((r) => !r.archived);
  const archivedReasons = reasons.filter((r) => r.archived);

  if (!hasActiveSession) {
    return <Navigate to="/reason-eliminator" replace />;
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-black tracking-tight">
            View Reasons
          </h1>
          <p className="mt-2 text-sm text-brand-gray-900">
            Review your saved Reasons. Edit any of them, add more, or start the
            Assessment.
          </p>
        </div>

        {reasons.length === 0 ? (
          <EmptyState
            title="No reasons yet"
            description="Head back to add the Reasons that stop you."
            action={
              <Button
                leftIcon={<FiArrowLeft />}
                onClick={() => navigate('/reason-eliminator/new')}
              >
                Add Reasons
              </Button>
            }
          />
        ) : (
          <>
            {activeReasons.length > 0 ? (
              <ReasonsTable
                reasons={activeReasons}
                editable
                onUpdate={updateReasonText}
                onArchive={archiveReason}
                onDelete={handleDelete}
              />
            ) : (
              <p className="text-center text-sm text-brand-gray-900">
                All Reasons are archived. Unarchive one below to continue.
              </p>
            )}

            {archivedReasons.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-brand-black mb-3">
                  Archived
                </h2>
                <ReasonsTable
                  reasons={archivedReasons}
                  editable
                  showCategory
                  showSubcategory
                  showPowerWord
                  onUpdate={updateReasonText}
                  onUnarchive={unarchiveReason}
                  onDelete={handleDelete}
                />
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button
                variant="secondary"
                leftIcon={<FiPlus />}
                onClick={() => navigate('/reason-eliminator/new')}
              >
                Add New Reason
              </Button>
              <Button
                onClick={handleForward}
                rightIcon={<FiArrowRight />}
              >
                {canResume ? 'Continue' : 'Start Assessment'}
              </Button>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
