import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar.jsx';
import Logo from '@/components/ui/Logo.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

/**
 * Minimal authenticated shell for the "Dashboard Home" (/home) — the 4-card
 * module picker. Per the product flow, this screen has NO sidebar: the sidebar
 * only appears once the user clicks into a module (e.g. Time Auditor → /dashboard,
 * which renders inside DashboardLayout).
 *
 * We reuse the shared <Navbar /> for the profile menu / notifications, but omit
 * `onOpenMobile` so its sidebar-toggle button stays hidden here.
 */
export default function HomeLayout() {
  return (
    <div className="min-h-screen bg-ink-950">
      {/* No sidebar here, so the brand logo lives in the top bar (shown everywhere). */}
      <Navbar leading={<Logo height={36} className="mr-1" />} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense
          fallback={
            <div className="grid h-[60vh] place-items-center">
              <Spinner size={32} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
