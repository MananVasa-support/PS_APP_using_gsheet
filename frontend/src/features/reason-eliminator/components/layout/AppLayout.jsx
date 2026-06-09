import Sidebar from './Sidebar.jsx';
import HubLink from '@/components/ui/HubLink.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Plain white background behind every screen. */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-white" />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 w-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
            <HubLink />
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8 pt-3 md:pb-12">
            {children}
          </div>
        </main>
        <footer className="border-t border-brand-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between text-sm text-brand-gray-900">
            <p>
              &copy; {new Date().getFullYear()} Altus Corp. All rights reserved.
            </p>
            <p className="hidden sm:block">Crafted with focus &amp; clarity.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
