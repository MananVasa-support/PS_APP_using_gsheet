import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiTarget,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import PlannerCard from "./PlannerCard";
import {
  parseDurationToHours,
  gapReasonTops,
  gapReasonSubPairs,
} from "../../utils/powerPlannerUtils";

const PALETTE = {
  red: "#dc2626",
  black: "#18181b",
  white: "#ffffff",
};

const GAP_KEYS = ["Time", "Focus", "Clarity", "Reality"];

const buildInsights = (weekData) => {
  const commitments = weekData?.commitments || [];
  const actions = weekData?.actions || [];

  const completedCommitments = commitments.filter((row) => row.progress >= 1).length;
  const completedActions = actions.filter((row) => row.progress >= 1).length;

  const plannedHours = actions.reduce((sum, a) => sum + parseDurationToHours(a.duration), 0);
  const loggedHours = actions
    .filter((a) => a.progress >= 1)
    .reduce((sum, a) => sum + parseDurationToHours(a.duration), 0);

  const delegatedCount = actions.filter(
    (a) => a.assignedTo && a.assignedTo !== "Self"
  ).length;

  const commitmentAvg =
    commitments.length === 0
      ? 0
      : commitments.reduce((sum, r) => sum + (r.progress || 0), 0) / commitments.length;
  const actionAvg =
    actions.length === 0
      ? 0
      : actions.reduce((sum, r) => sum + (r.progress || 0), 0) / actions.length;
  const completionPercentage =
    commitments.length === 0 && actions.length === 0
      ? 0
      : Math.round(((commitmentAvg + actionAvg) / 2) * 100);

  const incompleteCommitments = commitments
    .filter((r) => r.progress < 1)
    .map((r) => ({
      text: r.result || "Untitled goal",
      progress: Math.round((r.progress || 0) * 100),
    }));

  const incompleteActions = actions
    .filter((r) => r.progress < 1)
    .map((r) => ({
      text: r.description || "Untitled action",
      progress: Math.round((r.progress || 0) * 100),
    }));

  const gapReasonCounts = GAP_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  const gapReasonSub = GAP_KEYS.reduce((acc, key) => {
    acc[key] = {};
    return acc;
  }, {});
  [...commitments, ...actions].forEach((row) => {
    if (row.progress >= 1) return;
    gapReasonTops(row.gapReason).forEach((k) => {
      gapReasonCounts[k] += 1;
    });
    gapReasonSubPairs(row.gapReason).forEach(({ top, sub }) => {
      gapReasonSub[top][sub] = (gapReasonSub[top][sub] || 0) + 1;
    });
  });
  const gapReasonTotal = GAP_KEYS.reduce((s, k) => s + gapReasonCounts[k], 0);

  return {
    counts: {
      goalsDone: completedCommitments,
      goalsTotal: commitments.length,
      actionsDone: completedActions,
      actionsTotal: actions.length,
      delegated: delegatedCount,
      self: actions.length - delegatedCount,
    },
    completionPercentage,
    plannedHours: Number(plannedHours.toFixed(1)),
    loggedHours: Number(loggedHours.toFixed(1)),
    incompleteCommitments,
    incompleteActions,
    gapReasonCounts,
    gapReasonSub,
    gapReasonTotal,
    isEmpty: commitments.length === 0 && actions.length === 0,
  };
};

const PreviousWeekInsights = ({ weekLabel, weekData }) => {
  const insights = useMemo(() => buildInsights(weekData), [weekData]);

  if (insights.isEmpty) {
    return (
      <PlannerCard
        title={`This Week At A Glance · ${weekLabel || "Week"}`}
        description="Fill in Top Goals for this week and save — your insights will appear here."
      >
        <EmptyState message="No planner data has been saved for this week yet." />
      </PlannerCard>
    );
  }

  const donutData = [
    { name: "Completed", value: insights.completionPercentage, color: PALETTE.red },
    { name: "Pending", value: Math.max(0, 100 - insights.completionPercentage), color: PALETTE.black },
  ];

  return (
    <section className="space-y-4">
      <PlannerCard
        title={`This Week At A Glance · ${weekLabel || "Week"}`}
        description="Planner data from this week — use it to write your review."
      >
        <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
          <div className="relative h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "12px",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#ffffff" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-black">{insights.completionPercentage}%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-black">
                Completion
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat
              icon={FiTarget}
              label="Goals Completed"
              value={`${insights.counts.goalsDone}/${insights.counts.goalsTotal}`}
              percent={percentOf(insights.counts.goalsDone, insights.counts.goalsTotal)}
            />
            <MiniStat
              icon={FiCheckCircle}
              label="Actions Completed"
              value={`${insights.counts.actionsDone}/${insights.counts.actionsTotal}`}
              percent={percentOf(insights.counts.actionsDone, insights.counts.actionsTotal)}
            />
            <MiniStat
              icon={FiClock}
              label="Hours Logged"
              value={`${insights.loggedHours}h`}
              footnote={`Planned ${insights.plannedHours}h`}
            />
            <MiniStat
              icon={FiUsers}
              label="Delegated"
              value={`${insights.counts.delegated}`}
              footnote={`${insights.counts.self} self`}
            />
          </div>
        </div>
      </PlannerCard>

      {insights.gapReasonTotal > 0 ? (
        <PlannerCard
          title="Why It Slipped"
          description="Gap reasons across the goals and actions you did not finish."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GAP_KEYS.map((key) => {
              const count = insights.gapReasonCounts[key];
              const pct =
                insights.gapReasonTotal > 0
                  ? Math.round((count / insights.gapReasonTotal) * 100)
                  : 0;
              const subs = Object.entries(insights.gapReasonSub[key] || {})
                .filter(([, n]) => n > 0)
                .sort((a, b) => b[1] - a[1]);
              return (
                <div key={key} className="rounded-xl border border-black bg-white p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-black">
                      {key}
                    </p>
                    <p className="text-sm font-semibold text-red-600">{pct}%</p>
                  </div>
                  <p className="mt-1 text-xl font-bold text-black">{count}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white border border-black">
                    <div
                      className="h-full rounded-full bg-red-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {subs.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-zinc-200 pt-2">
                      {subs.map(([sub, n]) => (
                        <li
                          key={sub}
                          className="flex items-center justify-between gap-2 text-[11px] text-black"
                        >
                          <span className="truncate">{sub}</span>
                          <span className="shrink-0 font-bold text-black">{n}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </PlannerCard>
      ) : null}
    </section>
  );
};

const MiniStat = ({ icon: Icon, label, value, percent, footnote }) => (
  <div className="rounded-xl border border-black bg-white p-3">
    <div className="flex items-start justify-between">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-black">{label}</p>
      <span className="rounded-md border border-red-600 bg-red-600 p-1.5 text-white">
        <Icon className="text-sm" />
      </span>
    </div>
    <p className="mt-2 text-xl font-bold text-black">{value}</p>
    {typeof percent === "number" ? (
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white border border-black">
        <div
          className="h-full rounded-full bg-red-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    ) : null}
    {footnote ? <p className="mt-1 text-[10px] text-black">{footnote}</p> : null}
  </div>
);

const HighlightCard = ({ title, body, tone, icon: Icon }) => {
  const styles =
    tone === "positive"
      ? "border-red-600 bg-red-600 text-white"
      : tone === "negative"
        ? "border-black bg-black text-white"
        : "border-black bg-white text-black";

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-center gap-2">
        <Icon className="text-base" />
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug">{body}</p>
    </div>
  );
};

const UnfinishedList = ({ label, items }) => (
  <div className="rounded-lg border border-black p-3">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-black">{label}</p>
    {items.length === 0 ? (
      <p className="text-xs text-black">None left.</p>
    ) : (
      <ul className="space-y-1.5">
        {items.slice(0, 6).map((item, idx) => (
          <li key={`${label}-${idx}`} className="flex items-center justify-between gap-2 text-xs text-black">
            <span className="truncate">{item.text}</span>
            <span className="rounded-md bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {item.progress}%
            </span>
          </li>
        ))}
        {items.length > 6 ? (
          <li className="text-[11px] text-black">+ {items.length - 6} more…</li>
        ) : null}
      </ul>
    )}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="rounded-xl border border-dashed border-black bg-white p-6 text-center text-sm text-black">
    {message}
  </div>
);

const percentOf = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

export default PreviousWeekInsights;
