import clsx from "clsx";
import { FiArrowDownRight, FiArrowUpRight, FiMinus } from "react-icons/fi";
import PlannerCard from "./PlannerCard";

const trendClasses = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-zinc-500",
};

const trendIcons = {
  up: FiArrowUpRight,
  down: FiArrowDownRight,
  neutral: FiMinus,
};

const PlannerStats = ({ stats = [] }) => {
  return (
    <div className="powerplanner-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const TrendIcon = trendIcons[stat.trendDirection] || FiMinus;

        return (
          <PlannerCard key={stat.id} className="h-full">
            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-3xl font-semibold text-zinc-900">{stat.value}</p>
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-lg bg-zinc-50 px-2 py-1 text-xs font-semibold",
                  trendClasses[stat.trendDirection] || trendClasses.neutral
                )}
              >
                <TrendIcon className="text-sm" />
                {stat.trend}
              </span>
            </div>
          </PlannerCard>
        );
      })}
    </div>
  );
};

export default PlannerStats;
