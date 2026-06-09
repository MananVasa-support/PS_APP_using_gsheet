import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiClipboard, FiFolder, FiBarChart2, FiSettings,
  FiChevronLeft, FiChevronRight,
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
      className="w-7 h-7 rounded-lg border border-line text-muted hover:text-brand-red hover:border-brand-red/40 hover:bg-surface-alt flex items-center justify-center transition-colors shrink-0"
    >
      {collapsed ? <FiChevronRight className="text-sm" /> : <FiChevronLeft className="text-sm" />}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-surface text-mkink font-sans selection:bg-brand-red selection:text-white">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="bg-surface border-r border-line flex flex-col justify-between shrink-0 select-none overflow-hidden"
      >
        <div>
          {/* Logo + collapse toggle (always inside the sidebar bounds) */}
          {collapsed ? (
            <div className="h-20 flex flex-col items-center justify-center gap-2 border-b border-line">
              <div className="w-9 h-9 rounded-lg bg-brand-red flex items-center justify-center font-extrabold text-white shadow-red text-xl">
                M
              </div>
              {toggleButton}
            </div>
          ) : (
            <div className="h-20 px-5 flex items-center justify-between gap-2 border-b border-line">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand-red flex items-center justify-center font-extrabold text-white shadow-red shrink-0 text-xl">
                  M
                </div>
                <span className="font-extrabold text-base tracking-wide text-mkink whitespace-nowrap truncate">
                  SUCCESS <span className="text-brand-red">MAXIMIZER</span>
                </span>
              </div>
              {toggleButton}
            </div>
          )}

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
                        ? 'bg-brand-red-tint text-brand-red border-brand-red/30'
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

        {/* User Info / Settings Footer */}
        <div
          className={clsx(
            'p-4 border-t border-line flex items-center',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-brand-red-tint border border-brand-red/20 flex items-center justify-center font-bold text-brand-red text-md shrink-0">
              AD
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm leading-tight text-mkink truncate">Admin User</span>
                <span className="text-xs text-muted">Facilitator</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="p-2 text-muted hover:text-brand-red hover:bg-surface-alt rounded-lg transition-colors shrink-0">
              <FiSettings className="text-lg" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 pt-3 sm:px-8 bg-surface">
          <HubLink />
        </div>
        {/* Top Header */}
        <header className="h-20 border-b border-line px-6 sm:px-8 flex items-center justify-between bg-surface/80 backdrop-blur-md sticky top-0 z-40">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-mkink select-none">
              Meeting Success Maximizer
            </h1>
            <p className="text-xs text-muted select-none hidden sm:block">
              Plan & align meetings by auditing success markers.
            </p>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted select-none">System Status</p>
            <p className="text-sm font-semibold select-none">
              <span className="text-emerald-600 font-medium">SYSTEM READY</span>
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
