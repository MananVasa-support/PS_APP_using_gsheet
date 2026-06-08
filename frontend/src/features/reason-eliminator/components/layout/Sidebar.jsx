import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiPlay,
  FiClock,
  FiList,
  FiZap,
  FiAlertTriangle,
  FiActivity,
  FiArchive,
  FiBarChart2,
  FiTrash2,
  FiChevronsLeft,
  FiChevronsRight,
} from 'react-icons/fi';
import clsx from 'clsx';
import { useAssessmentFlow } from '@/features/reason-eliminator/features/reason-eliminator/context/AssessmentFlowContext.jsx';
import reasonEliminatorService from '@/features/reason-eliminator/features/reason-eliminator/services/reasonEliminatorService.js';
import gripTestService from '@/features/reason-eliminator/features/reason-eliminator/services/gripTestService.js';
import gripHistoryService from '@/features/reason-eliminator/features/reason-eliminator/services/gripHistoryService.js';

const LOGO =
  'https://res.cloudinary.com/drwoydou3/image/upload/v1777300803/ChatGPT_Image_Apr_23_2026_11_54_33_PM_km0ken.png';

// Sidebar is navigation chrome only. The two actions below reuse the EXISTING
// flow handlers (start a session, global reset) exactly as the Home screen did —
// no logic, state, routing, or storage behavior is changed.
export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { startSession, reset } = useAssessmentFlow();
  const [collapsed, setCollapsed] = useState(false);

  // Count of reasons still missing a Power Word — exactly what the Power Word
  // Missing page lists (active, non-archived reasons with no Power Word, across
  // all saved sessions). Read-only; recomputed each render (and on navigation,
  // via pathname) so the badge stays in sync. Nothing stored is changed.
  const missingPowerWordCount = reasonEliminatorService
    .listSessions()
    .flatMap((s) =>
      (s.reasons || []).filter(
        (r) => !r.archived && !(r.powerWord || '').trim()
      )
    ).length;

  // Responsive: start collapsed (icon-only) on small screens.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setCollapsed(true);
    }
  }, []);

  const handleStart = () => {
    reset();
    startSession();
    navigate('/reason-eliminator/new');
  };

  const handleResetAll = () => {
    if (
      !window.confirm(
        'Reset everything? This permanently deletes all assessments, reasons, Power Words, and Grip Test history. This cannot be undone.'
      )
    ) {
      return;
    }
    reasonEliminatorService.clearAll();
    gripTestService.clearAll();
    gripHistoryService.clearAll();
    reset();
    navigate('/reason-eliminator');
  };

  // Menu items in the requested order. `to` items navigate to an existing route;
  // `action` items invoke an existing handler. `match` drives active highlight.
  const items = [
    {
      key: 'start',
      label: 'Start New Assessment',
      icon: <FiPlay />,
      match: '/reason-eliminator/new',
      onClick: handleStart,
    },
    {
      key: 'previous',
      label: 'Previous Assessment',
      icon: <FiClock />,
      to: '/reason-eliminator/previous',
    },
    {
      key: 'reasons',
      label: 'Reasons Master',
      icon: <FiList />,
      to: '/reason-eliminator/reasons-master',
    },
    {
      key: 'power-word-master',
      label: 'Power Word Master',
      icon: <FiZap />,
      to: '/reason-eliminator/power-word-master',
    },
    {
      key: 'power-word-missing',
      label: 'Power Word Missing',
      icon: <FiAlertTriangle />,
      to: '/reason-eliminator/power-word-missing',
      count: missingPowerWordCount,
    },
    {
      key: 'grip-test',
      label: 'Start New Grip Test',
      icon: <FiActivity />,
      to: '/reason-eliminator/grip-test',
    },
    {
      key: 'grip-history',
      label: 'Previous Grip History',
      icon: <FiArchive />,
      to: '/reason-eliminator/grip-history',
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: <FiBarChart2 />,
      to: '/reason-eliminator/dashboard',
    },
  ];

  const resetItem = {
    key: 'reset',
    label: 'Reset All Data',
    icon: <FiTrash2 />,
    onClick: handleResetAll,
    danger: true,
  };

  const isActive = (item) => {
    const base = item.to || item.match;
    return base ? pathname.startsWith(base) : false;
  };

  const handleClick = (item) => {
    if (item.onClick) item.onClick();
    else navigate(item.to);
  };

  const renderItem = (item) => {
    const active = isActive(item);
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => handleClick(item)}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'flex items-center gap-3 h-11 rounded-xl text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          active
            ? 'bg-brand-black text-white shadow-sm'
            : item.danger
            ? 'text-brand-red hover:bg-brand-red-soft'
            : 'text-brand-gray-900 hover:bg-brand-gray-100 hover:text-brand-black'
        )}
      >
        <span
          className={clsx(
            'text-lg shrink-0',
            active ? 'text-white' : item.danger ? 'text-brand-red' : 'text-brand-red'
          )}
        >
          {item.icon}
        </span>
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
        {!collapsed && item.count ? (
          <span
            className={clsx(
              'ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold',
              active ? 'bg-white text-brand-red' : 'bg-brand-red text-white'
            )}
          >
            {item.count}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 252 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="sticky top-0 h-screen shrink-0 z-30 flex flex-col bg-white border-r border-brand-gray-200"
    >
      {/* Header: logo + title + collapse/expand toggle */}
      <div className="flex items-center gap-2 h-16 px-3 border-b border-brand-gray-100">
        <img
          src={LOGO}
          alt="Reasons Eliminator logo"
          className="w-9 h-9 rounded-lg object-cover shrink-0 shadow-card"
        />
        {!collapsed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="leading-tight flex-1 min-w-0"
          >
            <p className="text-sm font-bold text-brand-black tracking-tight truncate">
              Reasons
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-red">
              Eliminator
            </p>
          </motion.div>
        ) : null}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={clsx(
            'inline-flex items-center justify-center w-8 h-8 rounded-lg text-brand-gray-600 transition-colors hover:bg-brand-gray-100 hover:text-brand-black',
            collapsed ? 'mx-auto' : 'ml-auto'
          )}
        >
          {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 flex flex-col gap-1">
        {items.map(renderItem)}

        {/* Destructive action, separated from the navigation items. */}
        <div className="mt-auto pt-2 border-t border-brand-gray-100">
          {renderItem(resetItem)}
        </div>
      </nav>
    </motion.aside>
  );
}
