import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FiCompass, FiTarget, FiMessageCircle, FiGrid } from 'react-icons/fi';
import Navbar from '@/components/layout/Navbar.jsx';
import Footer from '@/components/layout/Footer.jsx';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat.jsx';
import ToolSidebar from '@/components/layout/ToolSidebar.jsx';
import Logo from '@/components/ui/Logo.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

/**
 * Shell for the simple single-page workshop tools (Expectations Crystalliser,
 * Totality Collector, Feedback Form). Same chrome as the Time Auditor client
 * layout: full-width navbar (brand logo + theme toggle), a standard tool
 * sidebar on the left, the page content centred to max-w-7xl, then the footer.
 * Reuses the exact existing components — no new layout pattern.
 */

// Shared nav cluster for the three workshop tools + the hub.
const NAV_ITEMS = [
  { key: 'expectations', label: 'Expectations Crystalliser ©', icon: <FiCompass />, to: '/expectations-crystalliser' },
  { key: 'totality', label: 'Totality Collector ©', icon: <FiTarget />, to: '/pre-ps/totality' },
  { key: 'feedback', label: 'Feedback Form ©', icon: <FiMessageCircle />, to: '/feedback' },
  { key: 'dashboard', label: 'Dashboard', icon: <FiGrid />, to: '/dashboard' },
];

// Per-route header (tool icon + title shown at the top of the sidebar).
const HEADERS = {
  '/expectations-crystalliser': { title: 'Expectations Crystalliser ©', icon: <FiCompass /> },
  '/pre-ps/totality': { title: 'Totality Collector ©', icon: <FiTarget /> },
  '/feedback': { title: 'Feedback Form ©', icon: <FiMessageCircle /> },
};

export default function ToolPageLayout() {
  const location = useLocation();
  const head = HEADERS[location.pathname] || { title: 'Workshop', icon: <FiGrid /> };

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar showSearch={false} leading={<Logo height={36} className="mr-1" to="/dashboard" />} />
      <div className="flex">
        <ToolSidebar
          title={head.title}
          icon={head.icon}
          items={NAV_ITEMS}
          collapseKey="ps_tool_sidebar_collapsed"
        />
        <div className="flex min-h-[calc(100vh-4rem)] min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Suspense
              fallback={
                <div className="grid h-[60vh] place-items-center">
                  <Spinner size={32} />
                </div>
              }
            >
              <div key={location.pathname} className="page-enter">
                <Outlet />
              </div>
            </Suspense>
          </main>
          <Footer />
        </div>
      </div>
      <WhatsAppFloat />
    </div>
  );
}
