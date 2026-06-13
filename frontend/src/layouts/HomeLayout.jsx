import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar.jsx';
import Footer from '@/components/layout/Footer.jsx';
import Logo from '@/components/ui/Logo.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

/**
 * Minimal authenticated shell for the "Dashboard Home" (/dashboard) — the 4-card
 * module picker. Per the product flow, this screen has NO sidebar: the sidebar
 * only appears once the user clicks into a module (e.g. Time Auditor → /dashboard,
 * which renders inside DashboardLayout).
 *
 * We reuse the shared <Navbar /> for the profile menu / notifications, but omit
 * `onOpenMobile` so its sidebar-toggle button stays hidden here.
 */
export default function HomeLayout() {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      {/* No sidebar here, so the brand logo lives in the top bar (shown everywhere). */}
      <Navbar leading={<Logo height={36} className="mr-1" to="/dashboard" />} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="grid h-[60vh] place-items-center">
              <Spinner size={32} />
            </div>
          }
        >
          {/* Keyed by route so the entrance animation replays on each navigation. */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
