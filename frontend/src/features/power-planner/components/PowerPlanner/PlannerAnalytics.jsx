import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiCheckCircle,
  FiClock,
  FiPlayCircle,
  FiTarget,
  FiTrendingUp,
} from "react-icons/fi";
import PlannerCard from "./PlannerCard";
import { pickNextSelfTask } from "../../utils/powerPlannerUtils";

const format24To12h = (time24) => {
  if (!time24 || typeof time24 !== "string") return "";
  const [hh, mm] = time24.split(":");
  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const buildEmptyReason = (commitments, actions) => {
  if (!actions || actions.length === 0) {
    return "No saved actions. Add one in Top Goals and click Save Top Goals.";
  }
  let totalSelf = 0;
  let incompleteSelf = 0;
  let withDate = 0;
  let futureOrToday = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  actions.forEach((a) => {
    if (String(a.assignedTo || "").trim().toLowerCase() === "self") totalSelf += 1;
    if (
      String(a.assignedTo || "").trim().toLowerCase() === "self" &&
      (a.progress || 0) < 1
    ) {
      incompleteSelf += 1;
      const parent = commitments.find((c) => c.id === a.parentCommitmentId);
      const date =
        (a.executionDate && a.executionDate.trim()) ||
        parent?.targetDate ||
        "";
      if (date) {
        withDate += 1;
        const [y, mo, d] = date.split("-").map(Number);
        if (![y, mo, d].some(Number.isNaN)) {
          const taskDate = new Date(y, mo - 1, d);
          if (taskDate >= today) futureOrToday += 1;
        }
      }
    }
  });
  if (totalSelf === 0) {
    return `Found ${actions.length} action(s) saved, but none have Delegate To set to "Self". Open Top Goals and set the dropdown to Self.`;
  }
  if (incompleteSelf === 0) {
    return `Found ${totalSelf} Self action(s), but all are at 100%. Mark a new one to see it here.`;
  }
  if (withDate === 0) {
    return `Found ${incompleteSelf} incomplete Self action(s), but none have a date — neither on the action nor on the parent goal. Set a Target Date.`;
  }
  if (futureOrToday === 0) {
    return `Found ${withDate} dated Self action(s), but all dates are in the past. Update the dates.`;
  }
  return "All actions with times have already started today. The next one will appear when its start time arrives.";
};

const metricConfig = [
  { key: "totalCommitments", label: "Total Commitments", icon: FiTarget },
  { key: "totalPlannedHours", label: "Total Planned Hours", icon: FiClock, suffix: "h" },
  { key: "completionPercentage", label: "Completion Percentage", icon: FiTrendingUp, suffix: "%" },
];

const formatTaskDate = (date) => {
  if (!date) return "";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.valueOf())) return date;
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
};

const formatRelative = (startAt, now) => {
  if (!startAt) return "";
  const diffMs = startAt - now;
  if (diffMs <= 0) return "";
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "in less than a minute";
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMin = mins - hours * 60;
  if (hours < 24) {
    return remainMin > 0 ? `in ${hours}h ${remainMin}m` : `in ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
};

const PlannerAnalytics = ({
  analytics,
  commitments = [],
  actions = [],
  onReviewTask,
}) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(id);
  }, []);

  const now = useMemo(() => new Date(), [tick]);
  const nextTask = useMemo(
    () => pickNextSelfTask(commitments, actions, now),
    [commitments, actions, now]
  );

  return (
    <section className="space-y-4">
      <div className="powerplanner-grid grid gap-4 md:grid-cols-3">
        {metricConfig.map((metric, index) => {
          const Icon = metric.icon;
          const rawValue = analytics[metric.key];
          const displayValue = `${rawValue}${metric.suffix || ""}`;

          return (
            <motion.div
              key={metric.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
            >
              <PlannerCard className="h-full">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-black">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-black">{displayValue}</p>
                  </div>
                  <span className="rounded-xl border border-red-600 bg-red-600 p-2.5 text-white">
                    <Icon className="text-lg" />
                  </span>
                </div>
                {metric.key === "completionPercentage" && (
                  <div className="mt-4 h-2 overflow-hidden rounded-full border border-black bg-white">
                    <div
                      className="h-full rounded-full bg-red-600 transition-all duration-500"
                      style={{ width: `${analytics.completionPercentage}%` }}
                    />
                  </div>
                )}
              </PlannerCard>
            </motion.div>
          );
        })}
      </div>

      <PlannerCard
        title="Next Task"
        description="Your Next Upcoming Self Task, Sorted by Date and Start Time."
      >
        <div className="rounded-xl border border-black bg-white p-4">
          {nextTask ? (
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-black">
                  {nextTask.parentSource}
                  {nextTask.parentLabel && nextTask.kind === "action"
                    ? ` · ${nextTask.parentLabel}`
                    : ""}
                </p>
                <p className="mt-1 text-xl font-bold leading-snug text-black md:text-2xl">
                  {nextTask.description || "Untitled task"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-black">
                <span className="inline-flex items-center gap-1 rounded-md border border-black bg-white px-2 py-1 font-semibold">
                  <FiClock className="text-red-600" />
                  {format24To12h(nextTask.startTime) || "--"}
                  {nextTask.endTime ? ` – ${format24To12h(nextTask.endTime)}` : ""}
                </span>
                <span className="rounded-md border border-black bg-white px-2 py-1 font-semibold">
                  {formatTaskDate(nextTask.executionDate)}
                </span>
                <span className="rounded-md border border-red-600 bg-red-600 px-2 py-1 font-semibold text-white">
                  Self
                </span>
                <span className="text-[11px] uppercase tracking-wide">
                  {formatRelative(nextTask.startAt, now)}
                </span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onReviewTask?.(nextTask)}
                  className="inline-flex items-center gap-2 rounded-xl border border-black bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 hover:border-red-600"
                >
                  <FiCheckCircle />
                  Done — go to Review
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-black">
              <FiPlayCircle className="mt-0.5 shrink-0 text-red-600" />
              <p>{buildEmptyReason(commitments, actions)}</p>
            </div>
          )}
        </div>
      </PlannerCard>
    </section>
  );
};

export default PlannerAnalytics;
