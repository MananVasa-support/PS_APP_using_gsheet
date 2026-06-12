import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import {
  AssessmentFlowProvider,
  useAssessmentFlow,
} from './features/reason-eliminator/context/AssessmentFlowContext.jsx';
import reasonEliminatorService from './features/reason-eliminator/services/reasonEliminatorService.js';
import Modal from './components/common/Modal.jsx';
import Button from './components/common/Button.jsx';
import { setNavGuard } from '@/lib/navGuard';
import reasonEliminatorRoutes from './features/reason-eliminator/routes.jsx';
import GuidelinesPage from './features/guidelines/GuidelinesPage.jsx';

/**
 * Leave guard for an assessment IN PROGRESS. Once reasons are added, the user
 * is committed to finishing the TCFR assessment for them: leaving the flow
 * before that (sidebar items, PS logo, Back, navbar, logout — anything routed
 * through the global nav guard) asks "discard or continue?".
 *
 * Once the TCFR assessment IS finished, leaving is free — the session is
 * persisted (it already shows in Previous Assessments) and any missing Power
 * Words are counted by the sidebar badge, to be filled in later from Previous
 * Assessments or the Power Word Missing page.
 */
function AssessmentLeaveGuard() {
  const { hasActiveSession, sessionId, reasons, persist, reset } =
    useAssessmentFlow();

  const active = (reasons || []).filter((r) => !r.archived);
  const started = hasActiveSession && active.length > 0;
  const tcfrDone =
    started &&
    active.every(
      (r) =>
        Array.isArray(r.categories) &&
        r.categories.length > 0 &&
        Array.isArray(r.details) &&
        r.details.length > 0
    );

  // The registered guard reads the CURRENT flow state on every trigger.
  const ref = useRef(null);
  ref.current = { started, tcfrDone, persist, reset, sessionId };

  const [pendingLeave, setPendingLeave] = useState(null); // held navigation

  useEffect(
    () =>
      setNavGuard((proceed) => {
        const g = ref.current;
        if (!g.started) {
          proceed();
          return;
        }
        if (g.tcfrDone) {
          // Assessment finished — make sure the latest state is saved (it
          // shows in Previous Assessments), then leave freely.
          try {
            g.persist();
          } catch {
            // never block navigation on a save hiccup
          }
          proceed();
          return;
        }
        setPendingLeave(() => proceed);
      }),
    []
  );

  const discard = () => {
    const g = ref.current;
    const go = pendingLeave;
    setPendingLeave(null);
    // Remove any partially-persisted copy of this session, then clear the
    // in-memory flow so nothing lingers in the masters.
    try {
      if (g.sessionId) reasonEliminatorService.deleteSession(g.sessionId);
    } catch {
      // ignore
    }
    g.reset();
    go?.();
  };

  return (
    <Modal
      open={!!pendingLeave}
      onClose={() => setPendingLeave(null)}
      title="Discard this assessment?"
      description="Your reasons haven't finished their TCFR assessment yet. Leaving now discards this assessment — or continue and finish it."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={discard}>
            Discard assessment
          </Button>
          <Button onClick={() => setPendingLeave(null)}>
            Continue assessment
          </Button>
        </>
      }
    />
  );
}

export default function App() {
  const location = useLocation();

  // Each page animates itself in via <PageTransition> (its mount animation).
  // We intentionally do NOT wrap the routes in <AnimatePresence mode="wait">:
  // gating the route swap on the leaving page's exit animation could deadlock
  // (the exit never completes), leaving the new page stuck/blank. Keying the
  // routes by pathname still remounts each page so its entrance animation runs.
  // The shell owns the router and mounts this subtree at /reason-eliminator/*,
  // so the route paths in reasonEliminatorRoutes are RELATIVE (path="" is home).
  return (
    <AssessmentFlowProvider>
      <AppLayout>
        <Routes location={location} key={location.pathname}>
          {reasonEliminatorRoutes}
          <Route path="guidelines" element={<GuidelinesPage />} />
          <Route path="*" element={<Navigate to="/reason-eliminator" replace />} />
        </Routes>
      </AppLayout>
      <AssessmentLeaveGuard />
    </AssessmentFlowProvider>
  );
}
