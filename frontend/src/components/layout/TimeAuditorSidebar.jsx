import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiClock, FiPieChart, FiAward, FiDownload, FiFileText,
  FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import { cn } from '@/utils/cn';
import { guardNav } from '@/lib/navGuard';

/**
 * Time Auditor's own tool sidebar — same interaction design as the other merged
 * tools (collapse spring, red active bar, tool-icon header), adapted to the dark
 * shell theme that Time Auditor and its analysis pages use. Every item belongs
 * to Time Auditor; "Dashboard" links back to the global tools hub.
 *
 * @param onHome  Optional. When provided (i.e. rendered inside the Time Auditor
 *                tool), the "Time Auditor" item resets the in-tool workflow to
 *                its home screen instead of a route change.
 */
const COLLAPSE_KEY = 'ta_tool_sidebar_collapsed';

export default function TimeAuditorSidebar({ onHome }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
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
      /* ignore */
    }
  }, [collapsed]);

  const items = [
    {
      key: 'time-auditor',
      label: 'Assessment',
      icon: <FiClock />,
      to: '/time-auditor',
      // Inside the tool, go back to the workflow home instead of re-navigating.
      onClick: onHome ? () => onHome() : undefined,
      match: '/time-auditor',
    },
    { key: 'analytics', label: 'Analytics', icon: <FiPieChart />, to: '/analytics' },
    { key: 'challenges', label: 'Challenges', icon: <FiAward />, to: '/level-2' },
    { key: 'reports', label: 'Export Reports', icon: <FiDownload />, to: '/reports' },
    { key: 'final-summary', label: 'Final Summary', icon: <FiFileText />, to: '/final-summary' },
  ];

  const isActive = (item) => {
    const base = item.match || item.to;
    if (item.key === 'time-auditor') return pathname === '/time-auditor';
    return base ? pathname.startsWith(base) : false;
  };

  const handleClick = (item) => {
    // Every sidebar jump (route change OR the in-tool "back to home" reset)
    // runs through the guard, so a mid-assessment user is asked before their
    // unsaved progress is discarded.
    guardNav(() => {
      if (item.onClick) item.onClick();
      else navigate(item.to);
    });
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 112 : 252 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="sticky top-16 z-30 flex h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-ink-700 bg-ink-900"
    >
      {/* Header: tool icon + title + collapse toggle */}
      <div className="flex h-16 items-center gap-2 border-b border-ink-800 px-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gradient text-xl text-white shadow-glow">
          <FiClock />
        </div>
        {!collapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-fg-strong"
          >
            Time Auditor
          </motion.p>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-fg-strong"
        >
          {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 no-scrollbar">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleClick(item)}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? "relative bg-ink-800 text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-red-600 before:content-['']"
                  : 'text-ink-400 hover:bg-ink-800 hover:text-fg-strong'
              )}
            >
              <span className={cn('shrink-0 text-lg', active ? 'text-white' : 'text-brand-400')}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </motion.aside>
  );
}
