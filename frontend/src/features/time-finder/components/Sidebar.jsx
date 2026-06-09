import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiPlayCircle, FiClock, FiBarChart2, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

// Absolute paths prefixed with the tool's mount (/time-finder). Bare paths
// like "/" or "/dashboard" would escape the tool and land on the shell
// (404 / back to the app home), so they MUST stay fully qualified.
const NAV = [
  { to: '/time-finder', label: 'Start Assessment', Icon: FiPlayCircle, end: true },
  { to: '/time-finder/previous-assessment', label: 'Previous Assessments', Icon: FiClock },
  { to: '/time-finder/dashboard', label: 'Dashboard', Icon: FiBarChart2 },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={
        'shrink-0 border-r border-gray-200 bg-white p-4 transition-all duration-200 ' +
        (collapsed ? 'w-28' : 'w-64')
      }
    >
      {/* Title + collapse */}
      {/* Header is always one row — arrow stays to the right of the logo in
          both states (only the name label is hidden when collapsed). */}
      <div className="mb-8 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xl text-white">
            <FiClock />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold tracking-tight text-black">
                Time Finder
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
        >
          {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
        </button>
      </div>

      {/* Nav */}
      <nav className="space-y-2">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ' +
              (isActive
                ? 'bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)]'
                : 'text-gray-700 hover:bg-red-100 hover:text-red-500')
            }
          >
            <Icon className="shrink-0 text-lg" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
