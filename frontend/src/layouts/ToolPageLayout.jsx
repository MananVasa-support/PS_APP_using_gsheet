import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import {
  FiCompass, FiTarget, FiMessageCircle, FiGrid,
  FiList, FiInbox, FiCalendar, FiBarChart2,
} from 'react-icons/fi';
import Navbar from '@/components/layout/Navbar.jsx';
import Footer from '@/components/layout/Footer.jsx';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat.jsx';
import ToolSidebar from '@/components/layout/ToolSidebar.jsx';
import Logo from '@/components/ui/Logo.jsx';
import Spinner from '@/components/ui/Spinner.jsx';

/**
 * Shell for the single-page workshop tools. Each tool gets its OWN dedicated
 * sidebar (its own nav items) — the same chrome/design as the Time Auditor
 * client layout (navbar + brand logo + standard tool sidebar + centred content
 * + footer + WhatsApp float). Reuses the existing components; no new patterns.
 */

// One config per tool: header (icon + title) + its own nav items.
const TOOLS = [
  {
    base: '/expectations-crystalliser',
    title: 'Expectations Crystalliser ©',
    icon: <FiCompass />,
    collapseKey: 'exp_sidebar_collapsed',
    items: [
      { key: 'main', label: 'Expectations Crystalliser ©', icon: <FiCompass />, to: '/expectations-crystalliser' },
      { key: 'mine', label: 'My Expectations', icon: <FiList />, to: '/expectations-crystalliser/my-expectations' },
    ],
  },
  {
    base: '/pre-ps/totality',
    title: 'Totality Collector ©',
    icon: <FiTarget />,
    collapseKey: 'tot_sidebar_collapsed',
    items: [
      { key: 'main', label: 'Totality Collector ©', icon: <FiTarget />, to: '/pre-ps/totality' },
      { key: 'all', label: 'All Tasks', icon: <FiList />, to: '/pre-ps/totality/all-tasks' },
      { key: 'planned', label: 'Scheduled Tasks', icon: <FiCalendar />, to: '/pre-ps/totality/planned' },
      { key: 'dashboard', label: 'Dashboard', icon: <FiBarChart2 />, to: '/pre-ps/totality/dashboard' },
    ],
  },
  {
    base: '/feedback',
    title: 'Feedback Form ©',
    icon: <FiMessageCircle />,
    collapseKey: 'fb_sidebar_collapsed',
    items: [
      { key: 'main', label: 'Feedback Form ©', icon: <FiMessageCircle />, to: '/feedback' },
      { key: 'submitted', label: 'Submitted Feedback', icon: <FiInbox />, to: '/feedback/submitted' },
    ],
  },
];

const FALLBACK = { title: 'Workshop', icon: <FiGrid />, collapseKey: 'tool_sidebar_collapsed', items: [] };

export default function ToolPageLayout() {
  const location = useLocation();
  // Pick the tool whose base best matches the current path (longest base wins
  // so /pre-ps/totality/all-tasks resolves to Totality, not a shorter base).
  const tool =
    [...TOOLS]
      .filter((t) => location.pathname === t.base || location.pathname.startsWith(`${t.base}/`))
      .sort((a, b) => b.base.length - a.base.length)[0] || FALLBACK;

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar showSearch={false} leading={<Logo height={36} className="mr-1" to="/dashboard" />} />
      <div className="flex">
        <ToolSidebar
          title={tool.title}
          icon={tool.icon}
          items={tool.items}
          collapseKey={tool.collapseKey}
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
