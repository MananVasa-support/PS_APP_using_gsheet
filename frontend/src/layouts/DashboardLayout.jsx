import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import Spinner from '@/components/ui/Spinner.jsx';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/utils/cn';

/**
 * Authenticated shell: fixed sidebar + sticky navbar + scrollable content.
 * Sidebar collapse state is remembered across sessions.
 */
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useLocalStorage('ta_sidebar_collapsed', false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {/* Scoped fallback: only the content area shows a spinner while a
              lazy page chunk loads, so the sidebar/navbar stay visible. */}
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
    </div>
  );
}
