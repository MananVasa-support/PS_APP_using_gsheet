import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import AuthLayout from '@/layouts/AuthLayout.jsx';
import HomeLayout from '@/layouts/HomeLayout.jsx';
import DashboardLayout from '@/layouts/DashboardLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

// Code-split pages for faster first paint.
const Landing = lazy(() => import('@/pages/Landing.jsx'));
const Login = lazy(() => import('@/pages/auth/Login.jsx'));
const Register = lazy(() => import('@/pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword.jsx'));
const WaitingApproval = lazy(() => import('@/pages/WaitingApproval.jsx'));
const Home = lazy(() => import('@/pages/Home.jsx'));
const Dashboard = lazy(() => import('@/pages/Dashboard.jsx'));
const Analytics = lazy(() => import('@/pages/Analytics.jsx'));
const Challenges = lazy(() => import('@/pages/Challenges.jsx'));
const Reports = lazy(() => import('@/pages/Reports.jsx'));
const Profile = lazy(() => import('@/pages/Profile.jsx'));
const Settings = lazy(() => import('@/pages/Settings.jsx'));
const Admin = lazy(() => import('@/pages/Admin.jsx'));
const Consultant = lazy(() => import('@/pages/Consultant.jsx'));
const Level2 = lazy(() => import('@/pages/Level2.jsx'));
const Level2Analysis = lazy(() => import('@/pages/level2/Analysis.jsx'));
const Top3Rankings = lazy(() => import('@/pages/level2/Top3Rankings.jsx'));
const Top4Rankings = lazy(() => import('@/pages/level2/Top4Rankings.jsx'));
const PerformanceBoard = lazy(() => import('@/pages/level2/PerformanceBoard.jsx'));
const MeetingFramework = lazy(() => import('@/pages/MeetingFramework.jsx'));
const PrePS = lazy(() => import('@/pages/PrePS.jsx'));
const PostPS = lazy(() => import('@/pages/PostPS.jsx'));
const ExpectationFromPS = lazy(() => import('@/pages/prePS/ExpectationFromPS.jsx'));
const Totality = lazy(() => import('@/pages/prePS/Totality.jsx'));
const PowerPlannerPage = lazy(() => import('@/pages/PowerPlannerPage.jsx'));
const TimeFinderPage = lazy(() => import('@/pages/TimeFinderPage.jsx'));
const ReasonEliminatorPage = lazy(() => import('@/pages/ReasonEliminatorPage.jsx'));
const TimeAuditor = lazy(() => import('@/pages/TimeAuditor.jsx'));
const SalesCultivator = lazy(() => import('@/pages/SalesCultivator.jsx'));
const PersonalSpace = lazy(() => import('@/pages/PersonalSpace.jsx'));
const PersonalSpaceForm = lazy(() => import('@/pages/personalSpace/PersonalSpaceForm.jsx'));
const Reminder = lazy(() => import('@/pages/Reminder.jsx'));
const Participants = lazy(() => import('@/pages/Participants.jsx'));
const FinalSummary = lazy(() => import('@/pages/FinalSummary.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

function PageFallback() {
  return (
    <div className="grid h-screen place-items-center bg-ink-950">
      <Spinner size={32} />
    </div>
  );
}

/**
 * Routing. We intentionally do NOT key <Routes> by pathname or wrap it in
 * AnimatePresence — that remounts the layout on every navigation and breaks
 * Back navigation. Per-page enter animations live inside each page.
 */
export default function AppRoutes() {
  const location = useLocation();

  // Start each newly navigated page at the top (predictable after back/forward).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public first screen */}
          <Route path="/" element={<Landing />} />

          {/* Auth — three dedicated role-specific login pages, plus a
              backward-compatible /login that defaults to client. */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login role="client" />} />
            <Route path="/admin-login" element={<Login role="admin" />} />
            <Route path="/consultant-login" element={<Login role="consultant" />} />
            <Route path="/client-login" element={<Login role="client" />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Authenticated but possibly pending */}
          <Route
            path="/waiting"
            element={
              <ProtectedRoute allowPending>
                <WaitingApproval />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Home — the 4-card module picker. No sidebar here:
              it lives in its own minimal HomeLayout. */}
          {/* No-sidebar shell — all tool/module pages live here so the user
              gets a focused full-screen workflow when using a tool. The
              sidebar reappears only on the main app pages (Dashboard,
              Analytics, Challenges, Reports, Settings, Profile, etc.). */}
          <Route
            element={
              <ProtectedRoute>
                <HomeLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pre-ps" element={<PrePS />} />
            <Route path="/pre-ps/expectation" element={<ExpectationFromPS />} />
            <Route path="/pre-ps/totality" element={<Totality />} />
            <Route path="/post-ps" element={<PostPS />} />
            <Route path="/sales-cultivator" element={<SalesCultivator />} />
            <Route path="/personal-space" element={<PersonalSpace />} />
            <Route path="/personal-space/:moduleId" element={<PersonalSpaceForm />} />
            <Route path="/reminder" element={<Reminder />} />
          </Route>

          {/* Sidebar shell — main app pages only (no tool/module pages). */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/level-2" element={<Level2 />} />
            <Route path="/level-2/analysis" element={<Level2Analysis />} />
            <Route path="/level-2/top-3" element={<Top3Rankings />} />
            <Route path="/level-2/top-4" element={<Top4Rankings />} />
            <Route path="/level-2/performance" element={<PerformanceBoard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/final-summary" element={<FinalSummary />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Time Auditor runs in its own full-screen workflow shell —
              the sidebar is intentionally hidden until the user clicks
              "Go To Dashboard" at the end of the assessment. */}
          <Route
            path="/time-auditor"
            element={
              <ProtectedRoute>
                <TimeAuditor />
              </ProtectedRoute>
            }
          />

          {/* Merged tools — each runs full-screen in its own theme/layout and
              owns its internal routing (splat). Mounted outside HomeLayout so
              the tool's own sidebar/header isn't double-wrapped. */}
          <Route
            path="/power-planner"
            element={
              <ProtectedRoute>
                <PowerPlannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reason-eliminator/*"
            element={
              <ProtectedRoute>
                <ReasonEliminatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-finder/*"
            element={
              <ProtectedRoute>
                <TimeFinderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meeting-framework/*"
            element={
              <ProtectedRoute>
                <MeetingFramework />
              </ProtectedRoute>
            }
          />

          {/* Admin-only — uses sidebar-less HomeLayout so the admin panel
              gets the full-width view, matching tool pages. */}
          <Route
            element={
              <ProtectedRoute adminOnly>
                <HomeLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* Consultant-only */}
          <Route
            element={
              <ProtectedRoute roles={['consultant']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/consultant" element={<Consultant />} />
            <Route path="/participants" element={<Participants />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
