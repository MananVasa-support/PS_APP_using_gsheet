import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiClipboard, FiFolder, FiBarChart2, FiUsers,
  FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import HubLink from '@/components/ui/HubLink.jsx';

const COLLAPSE_KEY = 'msm_sidebar_collapsed';

// Absolute paths prefixed with the tool's mount (/meeting-framework). Bare
// paths like "/" or "/dashboard" would escape the tool and land on the shell
// (404 / back to the app home), so they MUST stay fully qualified.
const menuItems = [
  { path: '/meeting-framework', name: 'Plan a Meeting', icon: FiClipboard, end: true },
  { path: '/meeting-framework/meeting-list', name: 'Meeting List', icon: FiFolder, end: false },
  { path: '/meeting-framework/dashboard', name: 'Dashboard', icon: FiBarChart2, end: false },
];

export default function Layout({ children }) {
  // Remember collapse state across refreshes.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Collapse/expand toggle — lives inside the sidebar so it is always fully
  // visible and never overlaps the logo, header, or nav items.
  const toggleButton = (
    <button
      onClick={() => setCollapsed((c) => !c)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand' : 'Collapse'}
      className="w-8 h-8 rounded-lg text-muted hover:text-mkink hover:bg-surface-alt flex items-center justify-center transition-colors shrink-0"
    >
      {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-surface text-mkink font-sans selection:bg-brand-red selection:text-white">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 112 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="bg-surface border-r border-line flex flex-col justify-between shrink-0 select-none overflow-hidden"
      >
        <div>
          {/* Logo + collapse toggle — always one row, arrow to the right of the
              logo (only the name hides when collapsed). */}
          <div className="h-20 px-3 flex items-center justify-between gap-2 border-b border-line">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-brand-red flex items-center justify-center text-white shadow-red shrink-0 text-xl">
                <FiUsers />
              </div>
              {!collapsed && (
                <div className="leading-tight min-w-0">
                  <p className="font-extrabold text-sm text-mkink truncate">Meeting Maximizer</p>
                </div>
              )}
            </div>
            {toggleButton}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  title={collapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center rounded-xl font-semibold transition-all duration-200 border border-transparent select-none',
                      collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                      isActive
                        ? "relative bg-[#18181b] text-white border-[#18181b] shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-red-600 before:content-['']"
                        : 'text-muted hover:bg-surface-alt hover:text-mkink hover:border-line'
                    )
                  }
                >
                  <Icon className="text-xl shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 pt-3 sm:px-8 bg-surface">
          <HubLink />
        </div>
        {/* Top Header */}
        <header className="h-20 border-b border-line px-6 sm:px-8 flex items-center justify-between bg-surface backdrop-blur-md sticky top-0 z-40">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-mkink select-none">
              Meeting Success Maximizer
            </h1>
            <p className="text-xs text-muted select-none hidden sm:block">
              Plan & align meetings by auditing success markers.
            </p>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-5 sm:p-8 overflow-y-auto bg-surface-alt">
          {children}
        </main>
      </div>
    </div>
  );
}
