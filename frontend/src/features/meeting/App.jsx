import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MeetingProvider, useMeeting } from './context/MeetingContext';
import { setNavGuard } from '@/lib/navGuard';
import Layout from './components/Layout';
import Prep from './pages/Prep';
import MeetingList from './pages/MeetingList';
import MeetingDetails from './pages/MeetingDetails';

// Dashboard pulls in Recharts (heavy) — load it only when visited.
const Dashboard = lazy(() => import('./pages/Dashboard'));

/**
 * Leave guard for the planning questionnaire. The answers live in context only
 * (they reach the database when the meeting is completed/saved), so leaving the
 * tool mid-form — PS logo, Back button, navbar, logout — would silently lose
 * them. This registers with the global guard and asks first. Navigation INSIDE
 * the tool is unaffected: the context (and the draft) stays mounted.
 */
function PlanningLeaveGuard() {
  const { isPlanningDirty, resetPlanning } = useMeeting();
  const dirtyRef = useRef(isPlanningDirty);
  dirtyRef.current = isPlanningDirty;
  const [pendingLeave, setPendingLeave] = useState(null); // held navigation

  useEffect(
    () =>
      setNavGuard((proceed) => {
        if (dirtyRef.current) setPendingLeave(() => proceed);
        else proceed();
      }),
    []
  );

  if (!pendingLeave) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-6 shadow-card">
        <h3 className="text-base font-bold text-mkink">Leave without saving?</h3>
        <p className="mt-2 text-xs text-muted">
          Your meeting answers aren&apos;t saved yet — they save when you complete the
          meeting. If you leave the tool now, they will be discarded.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPendingLeave(null)}
            className="w-full rounded-lg border border-line px-4 py-2.5 text-xs font-bold text-mkink hover:bg-brand-gray-100 transition-colors"
          >
            Stay on this page
          </button>
          <button
            type="button"
            onClick={() => {
              const go = pendingLeave;
              setPendingLeave(null);
              resetPlanning(); // next visit starts with a clean form
              go();
            }}
            className="w-full rounded-lg bg-brand-red px-4 py-2.5 text-xs font-bold uppercase text-white hover:bg-brand-red-dark transition-colors"
          >
            Leave &amp; discard answers
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <PlanningLeaveGuard />
    </MeetingProvider>
  );
}
