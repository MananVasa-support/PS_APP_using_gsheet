import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import HubLink from '@/components/ui/HubLink.jsx';

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="px-4 pt-4 sm:px-6">
          <HubLink />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
