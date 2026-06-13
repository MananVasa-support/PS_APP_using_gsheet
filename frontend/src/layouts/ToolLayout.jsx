import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar.jsx';
import Logo from '@/components/ui/Logo.jsx';

/**
 * Shared chrome for the merged full-screen tools (Power Planner, Reasons
 * Eliminator, Time Finder, Meeting). It renders the same top navbar as the rest
 * of the app — so every tool carries the brand, the user menu and the theme
 * toggle, and reads as part of one website. Each tool still renders its own left
 * sidebar for its internal navigation underneath this bar.
 */
export default function ToolLayout() {
  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar showSearch={false} leading={<Logo height={36} className="mr-1" to="/dashboard" />} />
      <Outlet />
    </div>
  );
}
