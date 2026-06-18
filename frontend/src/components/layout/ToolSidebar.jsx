import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import { cn } from '@/utils/cn';
import { guardNav } from '@/lib/navGuard';

/**
 * Generic tool sidebar — the SAME interaction design as TimeAuditorSidebar and
 * the merged tools (collapse spring, red active bar, tool-icon header), just
 * parameterised so simple single-page tools can reuse it without duplicating
 * the markup. Nothing here is new styling — it mirrors the existing pattern.
 *
 * @param title       Tool name shown in the header.
 * @param icon        Tool icon node shown in the header tile.
 * @param items       [{ key, label, icon, to, match? }] nav entries.
 * @param collapseKey localStorage key for the collapsed flag.
 */
export default function ToolSidebar({ title, icon, items, collapseKey = 'tool_sidebar_collapsed' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(collapseKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(collapseKey, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed, collapseKey]);

  // Exact match by default so a parent ("main") item doesn't stay highlighted
  // on its sub-pages; pass `match` for prefix-based highlighting when needed.
  const isActive = (item) => (item.match ? pathname.startsWith(item.match) : pathname === item.to);

  const handleClick = (item) => {
    guardNav(() => navigate(item.to));
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
          {icon}
        </div>
        {!collapsed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="min-w-0 flex-1 truncate text-sm font-bold tracking-tight text-fg-strong"
          >
            {title}
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
