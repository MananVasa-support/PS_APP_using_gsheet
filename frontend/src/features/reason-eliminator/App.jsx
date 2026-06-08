import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import { AssessmentFlowProvider } from './features/reason-eliminator/context/AssessmentFlowContext.jsx';
import reasonEliminatorRoutes from './features/reason-eliminator/routes.jsx';
import GuidelinesPage from './features/guidelines/GuidelinesPage.jsx';

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
    </AssessmentFlowProvider>
  );
}
