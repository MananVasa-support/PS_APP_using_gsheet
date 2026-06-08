import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MeetingProvider } from './context/MeetingContext';
import Layout from './components/Layout';
import Prep from './pages/Prep';
import MeetingList from './pages/MeetingList';
import MeetingDetails from './pages/MeetingDetails';

// Dashboard pulls in Recharts (heavy) — load it only when visited.
const Dashboard = lazy(() => import('./pages/Dashboard'));

/**
 * Meeting Success Maximizer feature root. The original standalone
 * <BrowserRouter> was removed during the merge — the shell owns the router and
 * mounts this subtree at /meeting-framework/*, so route paths are RELATIVE.
 */
export default function MeetingApp() {
  return (
    <MeetingProvider>
      <Layout>
        <Routes>
          <Route path="" element={<Prep />} />
          {/* Edit an existing (duplicated) meeting using the same Prep form */}
          <Route path="edit/:id" element={<Prep />} />
          <Route path="meeting-list" element={<MeetingList />} />
          <Route path="meeting-list/:id" element={<MeetingDetails />} />
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<div className="p-8 text-sm text-muted">Loading dashboard…</div>}>
                <Dashboard />
              </Suspense>
            }
          />
          {/* Redirect any unknown routes back to Plan a Meeting */}
          <Route path="*" element={<Navigate to="/meeting-framework" replace />} />
        </Routes>
      </Layout>
    </MeetingProvider>
  );
}
