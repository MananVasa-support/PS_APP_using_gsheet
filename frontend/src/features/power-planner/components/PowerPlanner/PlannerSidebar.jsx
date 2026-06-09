import clsx from "clsx";
import { FiCalendar, FiCheckCircle, FiClock, FiPieChart } from "react-icons/fi";

/**
 * Left navigation column for the Power Planner main view — mirrors the other
 * tools' sidebars (red active pill, icon + label, brand block at top). It holds
 * the Plan / Review / History / Totality switches that previously lived as a row
 * inside PlannerHeader. Pure presentation: it just calls the same handlers, so
 * the underlying tab logic is unchanged.
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
  const items = [
    { key: "plan", label: "Plan", icon: FiCalendar, active: planActive, onClick: onPlan },
    { key: "review", label: "Review", icon: FiCheckCircle, active: reviewActive, onClick: onReview },
    { key: "history", label: "History", icon: FiClock, active: historyActive, onClick: onHistory },
    { key: "totality", label: "Totality", icon: FiPieChart, active: false, onClick: onTotality },
  ];

  return (
    <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-56 shrink-0 flex-col gap-1 border-r border-black/10 bg-white p-3">
      <div className="mb-2 flex items-center gap-2.5 px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xl text-white">
          <FiCalendar />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-extrabold text-black">Power Planner</p>
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">
            Productivity Shastra
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                item.active
                  ? "bg-red-600 text-white"
                  : "text-black hover:bg-black hover:text-white"
              )}
            >
              <Icon className="shrink-0 text-lg" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default PlannerSidebar;
