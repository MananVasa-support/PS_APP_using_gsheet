import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar.jsx';
import TimeAuditorSidebar from '@/components/layout/TimeAuditorSidebar.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import Logo from '@/components/ui/Logo.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useAuth } from '@/hooks/useAuth';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/utils/cn';

const ContentFallback = (
  <div className="grid h-[60vh] place-items-center">
    <Spinner size={32} />
  </div>
);

/**
 * Authenticated shell for the Time Auditor suite (Analytics, Challenges, Reports,
 * Final Summary) and the consultant pages.
 *
 * - **Clients** get the **Time Auditor tool sidebar** (same one as /time-auditor),
 *   sitting below a full-width top navbar — so the whole Time Auditor experience
 *   reads as one tool.
 * - **Admin / Consultant** keep their own role sidebar (Admin Panel / Participants
 *   / Settings) in the classic fixed-sidebar shell.
 */
export default function DashboardLayout() {
  const { isAdmin, isConsultant } = useAuth();
  const [collapsed, setCollapsed] = useLocalStorage('ta_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Client → Time Auditor tool sidebar (full-width navbar + flex sidebar below).
  if (!isAdmin && !isConsultant) {
    return (
      <div className="min-h-screen bg-ink-950">
        <Navbar showSearch={false} leading={<Logo height={36} className="mr-1" to="/dashboard" />} />
        <div className="flex">
          <TimeAuditorSidebar />
          <div className="min-w-0 flex-1">
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <Suspense fallback={ContentFallback}>
                <div key={location.pathname} className="page-enter">
                  <Outlet />
                </div>
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Admin / Consultant → classic fixed role sidebar.
  return (
    <div className="min-h-screen bg-ink-950">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={cn('transition-all duration-300', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <Navbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={ContentFallback}>
            <div key={location.pathname} className="page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
