import { useState } from "react";
import clsx from "clsx";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPieChart,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";

const COLLAPSE_KEY = "power-planner-sidebar-collapsed";

/**
 * Left navigation column for the Power Planner main view — mirrors the other
 * tools' sidebars (red active pill, icon + label, collapsible via the same
 * double-chevron toggle). It holds the Plan / Review / History / Totality
 * switches that previously lived as a row inside PlannerHeader. Pure
 * presentation: it just calls the same handlers, so the tab logic is unchanged.
 */
const PlannerSidebar = ({
  onPlan,
  onReview,
  onHistory,
  onTotality,
  planActive,
  reviewActive,
  historyActive,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });

  const items = [
    { key: "plan", label: "Plan", icon: FiCalendar, active: planActive, onClick: onPlan },
    { key: "review", label: "Review", icon: FiCheckCircle, active: reviewActive, onClick: onReview },
    { key: "history", label: "History", icon: FiClock, active: historyActive, onClick: onHistory },
    { key: "totality", label: "Totality", icon: FiPieChart, active: false, onClick: onTotality },
  ];

  const toggleButton = (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand" : "Collapse"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-black"
    >
      {collapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
    </button>
  );

  return (
    <aside
      className={clsx(
        "sticky top-16 flex h-[calc(100vh-4rem)] shrink-0 flex-col gap-1 border-r border-black/10 bg-white p-3 transition-all duration-200",
        collapsed ? "w-28" : "w-56"
      )}
    >
      {/* Brand tile + collapse toggle — always one row, arrow to the right of
          the logo (in both expanded and collapsed states). */}
      <div className="mb-2 flex items-center justify-between gap-2 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xl text-white">
            <FiCalendar />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-extrabold text-black">Power Planner</p>
            </div>
          )}
        </div>
        {toggleButton}
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              title={collapsed ? item.label : undefined}
              aria-current={item.active ? "page" : undefined}
              className={clsx(
                "flex items-center rounded-xl text-sm font-semibold transition-colors",
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5",
                item.active
                  ? "relative bg-[#18181b] text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r before:bg-red-600 before:content-['']"
                  : "text-black hover:bg-black hover:text-white"
              )}
            >
              <Icon className="shrink-0 text-lg" />
              {!collapsed && item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default PlannerSidebar;
