import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiPlayCircle, FiClock, FiBarChart2, FiChevronLeft } from 'react-icons/fi';

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
        (collapsed ? 'w-20' : 'w-64')
      }
    >
      {/* Title + collapse */}
      <div className="mb-8 flex items-center justify-between">
        {!collapsed && (
          <span className="truncate pl-1 text-base font-extrabold tracking-tight text-black">
            Time Finder
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label="Toggle sidebar"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50"
        >
          <FiChevronLeft className={collapsed ? 'rotate-180' : ''} />
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
