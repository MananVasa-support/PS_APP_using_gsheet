import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiAlertCircle,
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiSlash,
  FiTarget,
  FiTrendingDown,
  FiTrendingUp,
  FiXCircle,
} from "react-icons/fi";
import PlannerCard from "./PlannerCard";
import {
  computeParentProgress,
  parseDurationToHours,
  gapReasonTops,
  gapReasonSubPairs,
} from "../../utils/powerPlannerUtils";

const PALETTE = {
  red: "#dc2626",
  black: "#18181b",
  white: "#ffffff",
  gray: "#9ca3af",
  amber: "#a1a1aa",
};
const TFCR = ["Time", "Focus", "Clarity", "Reality"];

// Empty {Time:{}, Focus:{}, …} sub-count accumulator.
const emptyTfcrSub = () =>
  TFCR.reduce((acc, k) => {
    acc[k] = {};
    return acc;
  }, {});

const formatHours = (h) => {
  if (h == null) return "—";
  if (h === 0) return "0h";
  return `${h.toFixed(1)}h`;
};

const percent = (done, total) => (total > 0 ? Math.round((done / total) * 100) : 0);

const countYes = (rows, key) =>
  rows.filter((row) => String(row?.[key] || "").toLowerCase() === "yes").length;

const buildInsights = (weekData) => {
  const commitments = weekData?.commitments || [];
  const actions = weekData?.actions || [];
  const otherCommitments = weekData?.otherCommitments || [];
  const stopDoing = weekData?.stopDoingNow || [];
  const watchout = weekData?.watchoutReasons || [];
  const insights = weekData?.lastWeekInsights || {};

  // ----- Top Goals section -----
  const goalsDone = commitments.filter(
    (c) => computeParentProgress(actions.filter((a) => a.parentCommitmentId === c.id)) >= 1
  ).length;
  const subsDone = actions.filter((a) => (a.progress || 0) >= 1).length;
  const subsTotal = actions.length;
  const goalsPlannedHours = actions.reduce(
    (s, a) => s + parseDurationToHours(a.duration),
    0
  );
  const goalsActualHours = actions.reduce(
    (s, a) => s + parseDurationToHours(a.actualDuration),
    0
  );
  const goalsCompletionPct = Math.round(
    actions.length === 0
      ? 0
      : (actions.reduce((s, a) => s + Math.min(1, a.progress || 0), 0) /
          actions.length) *
          100
  );

  // ----- Other Things section -----
  const otherDone = otherCommitments.filter((o) => (o.progress || 0) >= 1).length;
  const otherTotal = otherCommitments.length;
  const otherPlannedHours = otherCommitments.reduce(
    (s, o) => s + parseDurationToHours(o.duration),
    0
  );
  const otherActualHours = otherCommitments.reduce(
    (s, o) => s + parseDurationToHours(o.actualDuration),
    0
  );
  const otherCompletionPct = Math.round(
    otherCommitments.length === 0
      ? 0
      : (otherCommitments.reduce((s, o) => s + Math.min(1, o.progress || 0), 0) /
          otherCommitments.length) *
          100
  );

  // ----- TFCR breakdown (across Top Goals + their subs + Other Things) -----
  // Count every TFCR tag the user actually set. The reason picker only appears
  // when something slipped (incomplete) or overran, so any saved tag is real —
  // we don't gate on completion (a 100%-but-overran item still has a Time tag).
  const tfcrCounts = { Time: 0, Focus: 0, Clarity: 0, Reality: 0 };
  const tfcrCountsTopGoals = { ...tfcrCounts };
  const tfcrCountsOther = { ...tfcrCounts };
  const tfcrCountsStop = { ...tfcrCounts };
  // Sub-category tallies for the nested drill-down.
  const tfcrSub = emptyTfcrSub();
  const tallyTfcr = (row, bucket) => {
    gapReasonTops(row.gapReason).forEach((k) => {
      tfcrCounts[k] += 1;
      bucket[k] += 1;
    });
    gapReasonSubPairs(row.gapReason).forEach(({ top, sub }) => {
      tfcrSub[top][sub] = (tfcrSub[top][sub] || 0) + 1;
    });
  };
  // Goal rows themselves carry TFCR when the user scores a goal below 100%.
  commitments.forEach((c) => tallyTfcr(c, tfcrCountsTopGoals));
  actions.forEach((a) => tallyTfcr(a, tfcrCountsTopGoals));
  otherCommitments.forEach((o) => tallyTfcr(o, tfcrCountsOther));
  stopDoing.forEach((s) => tallyTfcr(s, tfcrCountsStop));
  const tfcrTotal = TFCR.reduce((s, k) => s + tfcrCounts[k], 0);
  const topTfcr =
    tfcrTotal === 0
      ? null
      : TFCR.reduce((best, k) =>
          tfcrCounts[k] > tfcrCounts[best] ? k : best
        );

  // ----- Time overruns (actual > allotted) -----
  const overruns = [];
  const timeSavers = [];
  const collectTimeRows = (rows, kind, labelKey) => {
    rows.forEach((row) => {
      const planned = parseDurationToHours(row.duration);
      const actual = parseDurationToHours(row.actualDuration);
      if (!planned && !actual) return;
      const delta = actual - planned;
      const label = row[labelKey]?.trim() ? row[labelKey] : `(empty ${kind})`;
      if (planned > 0 && actual > planned) {
        overruns.push({
          kind,
          label,
          planned,
          actual,
          delta,
          deltaPct: planned > 0 ? Math.round((delta / planned) * 100) : 0,
        });
      } else if (planned > 0 && actual > 0 && actual < planned) {
        timeSavers.push({
          kind,
          label,
          planned,
          actual,
          delta: planned - actual,
          deltaPct: Math.round(((planned - actual) / planned) * 100),
        });
      }
    });
  };
  collectTimeRows(actions, "sub-action", "description");
  collectTimeRows(otherCommitments, "other thing", "result");
  overruns.sort((a, b) => b.delta - a.delta);
  timeSavers.sort((a, b) => b.delta - a.delta);

  // ----- To Stop (now scored by % stopped/reduced) -----
  // Fully stopped = 100%. Hours reclaimed come from the weekly time of items
  // that hit 100%; the rest is still being lost.
  const stoppedCount = stopDoing.filter((r) => (r.progress || 0) >= 1).length;
  const notStoppedCount = stopDoing.filter((r) => (r.progress || 0) < 1).length;
  const stoppedHoursReclaimed = stopDoing
    .filter((r) => (r.progress || 0) >= 1)
    .reduce((s, r) => s + parseDurationToHours(r.weeklyTime), 0);
  const wastedHoursStill = stopDoing
    .filter((r) => (r.progress || 0) < 1)
    .reduce((s, r) => s + parseDurationToHours(r.weeklyTime), 0);

  // ----- Watch-out reasons defeated -----
  const watchDefeated = countYes(watchout, "defeated");
  const watchNotDefeated = watchout.filter(
    (r) => String(r.defeated || "").toLowerCase() === "no"
  ).length;

  // ----- By Category breakdown -----
  // Effective category: a sub-action with no category of its own inherits its
  // goal's; goals and other things use their own. We roll completion + incomplete
  // counts off the RESULT rows (goals + other things), and time + TFCR off
  // whatever rows carry them (sub-actions + other things, plus goal-level TFCR).
  const resolveTag = (val, custom) => (val === "Other" ? custom : val) || "";
  const catMap = {};
  const ensureCat = (name) => {
    const key = name || "Uncategorized";
    if (!catMap[key]) {
      catMap[key] = {
        name: key,
        resultCount: 0,
        doneCount: 0,
        incompleteCount: 0,
        progressSum: 0,
        plannedHours: 0,
        actualHours: 0,
        tfcrCounts: { Time: 0, Focus: 0, Clarity: 0, Reality: 0 },
      };
    }
    return catMap[key];
  };
  const addTfcrToCat = (bucket, row) => {
    gapReasonTops(row.gapReason).forEach((k) => {
      bucket.tfcrCounts[k] += 1;
    });
  };
  commitments.forEach((c) => {
    const b = ensureCat(resolveTag(c.category, c.customCategory));
    const p = Math.min(1, c.progress || 0);
    b.resultCount += 1;
    b.progressSum += p;
    if (p >= 1) b.doneCount += 1;
    else b.incompleteCount += 1;
    addTfcrToCat(b, c);
  });
  actions.forEach((a) => {
    const parent = commitments.find((c) => c.id === a.parentCommitmentId);
    const cat = a.category
      ? resolveTag(a.category, a.customCategory)
      : resolveTag(parent?.category, parent?.customCategory);
    const b = ensureCat(cat);
    b.plannedHours += parseDurationToHours(a.duration);
    b.actualHours += parseDurationToHours(a.actualDuration);
    addTfcrToCat(b, a);
  });
  otherCommitments.forEach((o) => {
    const b = ensureCat(resolveTag(o.category, o.customCategory));
    const p = Math.min(1, o.progress || 0);
    b.resultCount += 1;
    b.progressSum += p;
    if (p >= 1) b.doneCount += 1;
    else b.incompleteCount += 1;
    b.plannedHours += parseDurationToHours(o.duration);
    b.actualHours += parseDurationToHours(o.actualDuration);
    addTfcrToCat(b, o);
  });
  const byCategory = Object.values(catMap)
    .map((b) => {
      const tfcrTotal = TFCR.reduce((s, k) => s + b.tfcrCounts[k], 0);
      const topTfcr =
        tfcrTotal === 0
          ? null
          : TFCR.reduce((best, k) =>
              b.tfcrCounts[k] > b.tfcrCounts[best] ? k : best
            );
      return {
        ...b,
        plannedHours: Number(b.plannedHours.toFixed(1)),
        actualHours: Number(b.actualHours.toFixed(1)),
        overrunHours: Number(Math.max(0, b.actualHours - b.plannedHours).toFixed(1)),
        completionPct:
          b.resultCount > 0 ? Math.round((b.progressSum / b.resultCount) * 100) : 0,
        tfcrTotal,
        topTfcr,
      };
    })
    .sort(
      (a, b) =>
        b.incompleteCount - a.incompleteCount || b.actualHours - a.actualHours
    );
  const pickTop = (rows, key) =>
    [...rows].filter((c) => c[key] > 0).sort((a, b) => b[key] - a[key])[0] || null;
  const categoryHeadlines = {
    mostIncompleteCat: pickTop(byCategory, "incompleteCount"),
    mostTimeCat: pickTop(byCategory, "actualHours"),
    mostOverrunCat: pickTop(byCategory, "overrunHours"),
    topTfcrCat: pickTop(byCategory, "tfcrTotal"),
  };

  return {
    isEmpty:
      commitments.length === 0 &&
      actions.length === 0 &&
      otherCommitments.length === 0 &&
      stopDoing.length === 0 &&
      watchout.length === 0,
    topGoals: {
      goalsCount: commitments.length,
      goalsDone,
      subsCount: subsTotal,
      subsDone,
      plannedHours: Number(goalsPlannedHours.toFixed(1)),
      actualHours: Number(goalsActualHours.toFixed(1)),
      completionPct: goalsCompletionPct,
      tfcrCounts: tfcrCountsTopGoals,
    },
    otherThings: {
      count: otherTotal,
      done: otherDone,
      plannedHours: Number(otherPlannedHours.toFixed(1)),
      actualHours: Number(otherActualHours.toFixed(1)),
      completionPct: otherCompletionPct,
      tfcrCounts: tfcrCountsOther,
    },
    toStop: {
      tfcrCounts: tfcrCountsStop,
    },
    overall: {
      tfcrCounts,
      tfcrSub,
      tfcrTotal,
      topTfcr,
      plannedHours: Number((goalsPlannedHours + otherPlannedHours).toFixed(1)),
      actualHours: Number((goalsActualHours + otherActualHours).toFixed(1)),
    },
    byCategory,
    categoryHeadlines,
    overruns: overruns.slice(0, 5),
    timeSavers: timeSavers.slice(0, 5),
    learnings: {
      total: stopDoing.length,
      stopped: stoppedCount,
      notStopped: notStoppedCount,
      reclaimedHours: Number(stoppedHoursReclaimed.toFixed(1)),
      stillWastedHours: Number(wastedHoursStill.toFixed(1)),
    },
    watchout: {
      total: watchout.length,
      defeated: watchDefeated,
      notDefeated: watchNotDefeated,
    },
    notes: insights,
  };
};

const HistoryWorkspace = ({
  weekKeys = [],
  getWeekDataByKey,
  formatLabel = (key) => key,
}) => {
  const [selectedWeek, setSelectedWeek] = useState(weekKeys[0] || "");

  // Keep the selection valid as saved weeks change (e.g. first save).
  useEffect(() => {
    if (weekKeys.length === 0) return;
    if (!weekKeys.includes(selectedWeek)) setSelectedWeek(weekKeys[0]);
  }, [weekKeys, selectedWeek]);

  const weekData = useMemo(
    () => (selectedWeek ? getWeekDataByKey(selectedWeek) : null),
    [getWeekDataByKey, selectedWeek]
  );
  const insights = useMemo(() => buildInsights(weekData), [weekData]);

  if (weekKeys.length === 0) {
    return (
      <div className="space-y-4">
        <PlannerCard
          title="History"
          description="Past Weeks Will Appear Here."
        >
          <p className="rounded-xl border border-dashed border-black bg-white p-6 text-center text-sm text-black">
            No past weeks yet. Plan a week and click Save — its insights will show up here.
          </p>
        </PlannerCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold text-black">History</label>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="rounded-lg border border-black bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-red-600"
        >
          {weekKeys.map((weekKey) => (
            <option key={weekKey} value={weekKey}>
              {formatLabel(weekKey)}
            </option>
          ))}
        </select>
      </div>

      {insights.isEmpty ? (
        <PlannerCard
          title="No Saved Data"
          description="Nothing Has Been Saved for This Week Yet."
        >
          <p className="rounded-xl border border-dashed border-black bg-white p-6 text-center text-sm text-black">
            Fill in Top Goals, Other Things, or Learnings for this week and click Save —
            your insights will appear here.
          </p>
        </PlannerCard>
      ) : (
        <>
          <HeadlineCallout insights={insights} />
          <TopGoalsSection topGoals={insights.topGoals} />
          <OtherThingsSection otherThings={insights.otherThings} />
          <ByCategorySection
            byCategory={insights.byCategory}
            headlines={insights.categoryHeadlines}
          />
          <TfcrCard
            overall={insights.overall}
            topGoals={insights.topGoals}
            otherThings={insights.otherThings}
            toStop={insights.toStop}
          />
          <TimeAnalyticsCard
            overall={insights.overall}
            topGoals={insights.topGoals}
            otherThings={insights.otherThings}
          />
          <OverrunsAndSavers
            overruns={insights.overruns}
            timeSavers={insights.timeSavers}
          />
          <LearningsInsights
            learnings={insights.learnings}
            watchout={insights.watchout}
          />
          {hasAnyNote(insights.notes) ? (
            <NotesRecap notes={insights.notes} />
          ) : null}
        </>
      )}
    </div>
  );
};

const hasAnyNote = (notes) =>
  Object.values(notes || {}).some((v) => String(v || "").trim().length > 0);

const HeadlineCallout = ({ insights }) => {
  const lines = [];
  const completion =
    insights.topGoals.subsCount + insights.otherThings.count > 0
      ? Math.round(
          ((insights.topGoals.completionPct * insights.topGoals.subsCount) +
            (insights.otherThings.completionPct * insights.otherThings.count)) /
            Math.max(
              1,
              insights.topGoals.subsCount + insights.otherThings.count
            )
        )
      : 0;
  lines.push(`Overall completion: ${completion}%.`);
  if (insights.overall.topTfcr) {
    lines.push(
      `Biggest reason for slippage: ${insights.overall.topTfcr} (${
        insights.overall.tfcrCounts[insights.overall.topTfcr]
      } of ${insights.overall.tfcrTotal} TFCR tags).`
    );
  }
  if (insights.overruns.length > 0) {
    const top = insights.overruns[0];
    lines.push(
      `Top time overrun: "${top.label}" went over by ${formatHours(top.delta)} (${top.deltaPct}%).`
    );
  }
  const ch = insights.categoryHeadlines || {};
  if (ch.mostIncompleteCat) {
    lines.push(
      `Most incomplete category: ${ch.mostIncompleteCat.name} (${ch.mostIncompleteCat.incompleteCount} of ${ch.mostIncompleteCat.resultCount} results unfinished).`
    );
  }
  if (ch.mostTimeCat && ch.mostTimeCat.actualHours > 0) {
    lines.push(
      `Most time went to ${ch.mostTimeCat.name} (${formatHours(ch.mostTimeCat.actualHours)} logged).`
    );
  }
  if (ch.topTfcrCat && ch.topTfcrCat.topTfcr) {
    lines.push(
      `${ch.topTfcrCat.topTfcr} came up most in ${ch.topTfcrCat.name} (${ch.topTfcrCat.tfcrCounts[ch.topTfcrCat.topTfcr]}×).`
    );
  }
  if (insights.learnings.stopped > 0) {
    lines.push(
      `You stopped ${insights.learnings.stopped} of ${insights.learnings.total} unproductive habits and reclaimed ~${formatHours(insights.learnings.reclaimedHours)} a week.`
    );
  }
  return (
    <PlannerCard title="Headline" description="The Fastest Way to Read This Week.">
      <ul className="list-disc space-y-1 pl-5 text-sm text-black">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </PlannerCard>
  );
};

const TopGoalsSection = ({ topGoals }) => {
  const donut = [
    { name: "Completed", value: topGoals.completionPct, color: PALETTE.red },
    {
      name: "Pending",
      value: Math.max(0, 100 - topGoals.completionPct),
      color: PALETTE.black,
    },
  ];
  return (
    <PlannerCard
      title="Top Goals — Completion & Hours"
      description="How Your Structured Goals Went This Week."
    >
      <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
        <div className="relative h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donut}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={88}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {donut.map((e) => (
                  <Cell key={e.name} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: PALETTE.black,
                  color: PALETTE.white,
                  border: "none",
                  fontSize: 12,
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-black">
              {topGoals.completionPct}%
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black">
              Completion
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MiniStat
            icon={FiCheckCircle}
            label="Work Done"
            value={`${topGoals.subsDone}/${topGoals.subsCount}`}
            percent={percent(topGoals.subsDone, topGoals.subsCount)}
            footnote={`${topGoals.goalsDone}/${topGoals.goalsCount} goals fully done`}
          />
          <MiniStat
            icon={FiSlash}
            label="Work Left"
            value={`${Math.max(0, topGoals.subsCount - topGoals.subsDone)}`}
            footnote={`${Math.max(0, 100 - topGoals.completionPct)}% remaining`}
          />
          <MiniStat
            icon={FiArrowUpCircle}
            label="Hours Done"
            value={formatHours(topGoals.actualHours)}
            footnote={`of ${formatHours(topGoals.plannedHours)} planned`}
          />
          <MiniStat
            icon={FiClock}
            label="Hours Left"
            value={formatHours(Math.max(0, topGoals.plannedHours - topGoals.actualHours))}
            footnote="planned minus logged"
          />
        </div>
      </div>
    </PlannerCard>
  );
};

// Compact secondary card — Top Goals is the main event, this is a quick strip.
const OtherThingsSection = ({ otherThings }) => {
  const hoursLeft = Math.max(0, otherThings.plannedHours - otherThings.actualHours);
  return (
    <PlannerCard
      title="Other Things"
      description="A Quick Read on the Lighter Items."
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-black">
            {otherThings.completionPct}%
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black">
            complete
          </span>
        </div>
        <div className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full border border-black bg-white">
          <div
            className="h-full rounded-full bg-red-600"
            style={{ width: `${otherThings.completionPct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-black">
          <span>Done {otherThings.done}/{otherThings.count}</span>
          <span>Hours done {formatHours(otherThings.actualHours)}</span>
          <span>Hours left {formatHours(hoursLeft)}</span>
        </div>
      </div>
    </PlannerCard>
  );
};

const ByCategorySection = ({ byCategory, headlines }) => {
  if (!byCategory || byCategory.length === 0) return null;
  const ch = headlines || {};
  const callouts = [];
  if (ch.mostIncompleteCat) {
    callouts.push(
      `${ch.mostIncompleteCat.name} is the most incomplete — ${ch.mostIncompleteCat.incompleteCount} of ${ch.mostIncompleteCat.resultCount} results unfinished.`
    );
  }
  if (ch.mostTimeCat && ch.mostTimeCat.actualHours > 0) {
    callouts.push(
      `Most time went to ${ch.mostTimeCat.name} (${formatHours(ch.mostTimeCat.actualHours)} logged).`
    );
  }
  if (ch.topTfcrCat && ch.topTfcrCat.topTfcr) {
    callouts.push(
      `${ch.topTfcrCat.topTfcr} showed up most in ${ch.topTfcrCat.name} (${ch.topTfcrCat.tfcrCounts[ch.topTfcrCat.topTfcr]}×).`
    );
  }
  return (
    <PlannerCard
      title="By Category"
      description="Where Your Week Actually Went — Completion, Time and TFCR per Category."
    >
      {callouts.length > 0 ? (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-black">
          {callouts.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
            <tr className="border-b border-black">
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-center">Results done</th>
              <th className="px-3 py-2 text-center">Completion</th>
              <th className="px-3 py-2 text-center">Planned</th>
              <th className="px-3 py-2 text-center">Actual</th>
              <th className="px-3 py-2 text-center">Overrun</th>
              <th className="px-3 py-2">Top TFCR</th>
            </tr>
          </thead>
          <tbody>
            {byCategory.map((c) => (
              <tr key={c.name} className="border-b border-black align-middle">
                <td className="px-3 py-2 font-semibold text-black">{c.name}</td>
                <td className="px-3 py-2 text-center text-black">
                  {c.resultCount > 0 ? `${c.doneCount}/${c.resultCount}` : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex min-w-[3rem] justify-center rounded-md border px-2 py-0.5 text-xs font-bold ${
                      c.completionPct >= 100
                        ? "border-red-600 bg-red-600 text-white"
                        : "border-black bg-white text-black"
                    }`}
                  >
                    {c.resultCount > 0 ? `${c.completionPct}%` : "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-black">
                  {formatHours(c.plannedHours)}
                </td>
                <td className="px-3 py-2 text-center text-black">
                  {formatHours(c.actualHours)}
                </td>
                <td className="px-3 py-2 text-center font-semibold text-black">
                  {c.overrunHours > 0 ? `+${formatHours(c.overrunHours)}` : "—"}
                </td>
                <td className="px-3 py-2 text-black">
                  {c.topTfcr ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded border border-red-600 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                        {c.topTfcr}
                      </span>
                      <span className="text-[11px] text-black">
                        ×{c.tfcrCounts[c.topTfcr]}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PlannerCard>
  );
};

const TfcrCard = ({ overall, topGoals, otherThings, toStop }) => {
  const data = TFCR.map((k) => ({
    name: k,
    "Top Goals": topGoals.tfcrCounts[k] || 0,
    "Other Things": otherThings.tfcrCounts[k] || 0,
    "To Stop": toStop?.tfcrCounts?.[k] || 0,
  }));
  return (
    <PlannerCard
      title="Why It Slipped — TFCR Breakdown"
      description="What Kept You From Finishing. Stacked Across Top Goals and Other Things."
    >
      {overall.tfcrTotal === 0 ? (
        <p className="text-xs italic text-black">
          No TFCR tags recorded this week.
        </p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" stroke={PALETTE.black} fontSize={12} />
                <YAxis stroke={PALETTE.black} fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: PALETTE.black,
                    color: PALETTE.white,
                    border: "none",
                    fontSize: 12,
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Top Goals" stackId="a" fill={PALETTE.red} />
                <Bar dataKey="Other Things" stackId="a" fill={PALETTE.black} />
                <Bar dataKey="To Stop" stackId="a" fill={PALETTE.gray} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <TfcrDrilldown
            tfcrCounts={overall.tfcrCounts}
            tfcrSub={overall.tfcrSub}
            tfcrTotal={overall.tfcrTotal}
          />
        </>
      )}
    </PlannerCard>
  );
};

// Nested drill-down: each TFCR reason that came up, with its sub-category
// breakdown underneath. Only reasons (and subs) with a count are shown.
const TfcrDrilldown = ({ tfcrCounts, tfcrSub, tfcrTotal }) => {
  const reasons = TFCR.filter((k) => (tfcrCounts[k] || 0) > 0);
  if (reasons.length === 0) return null;
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {reasons.map((reason) => {
        const subs = Object.entries(tfcrSub[reason] || {})
          .filter(([, n]) => n > 0)
          .sort((a, b) => b[1] - a[1]);
        const pct = Math.round((tfcrCounts[reason] / tfcrTotal) * 100);
        return (
          <div key={reason} className="rounded-xl border border-black bg-white p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide text-black">
                {reason}
              </p>
              <p className="text-sm font-bold text-red-600">
                {tfcrCounts[reason]}{" "}
                <span className="text-[10px] font-semibold text-black">
                  · {pct}%
                </span>
              </p>
            </div>
            {subs.length === 0 ? (
              <p className="mt-1.5 text-[11px] italic text-black/50">
                No sub-reason picked.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {subs.map(([sub, n]) => (
                  <li
                    key={sub}
                    className="flex items-center justify-between gap-2 text-[11px] text-black"
                  >
                    <span className="truncate">{sub}</span>
                    <span className="shrink-0 rounded border border-black bg-white px-1.5 py-0.5 text-[10px] font-bold text-black">
                      {n}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

const TimeAnalyticsCard = ({ overall, topGoals, otherThings }) => {
  const data = [
    {
      name: "Top Goals",
      Planned: topGoals.plannedHours,
      Actual: topGoals.actualHours,
    },
    {
      name: "Other Things",
      Planned: otherThings.plannedHours,
      Actual: otherThings.actualHours,
    },
    {
      name: "Total",
      Planned: overall.plannedHours,
      Actual: overall.actualHours,
    },
  ];
  const totalOverrun = Math.max(0, overall.actualHours - overall.plannedHours);
  const totalUnderrun = Math.max(0, overall.plannedHours - overall.actualHours);
  return (
    <PlannerCard
      title="Time Spent vs Planned"
      description="Did You Stay on the Clock or Did Things Blow Up?"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr,260px]">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke={PALETTE.black} fontSize={12} />
              <YAxis stroke={PALETTE.black} fontSize={12} unit="h" />
              <Tooltip
                contentStyle={{
                  background: PALETTE.black,
                  color: PALETTE.white,
                  border: "none",
                  fontSize: 12,
                  borderRadius: 8,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Planned" fill={PALETTE.black} />
              <Bar dataKey="Actual" fill={PALETTE.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          <TimeTile
            label="Planned"
            value={formatHours(overall.plannedHours)}
            tone="neutral"
            icon={FiClock}
          />
          <TimeTile
            label="Logged"
            value={formatHours(overall.actualHours)}
            tone="positive"
            icon={FiArrowUpCircle}
          />
          <TimeTile
            label="Overrun (above plan)"
            value={formatHours(totalOverrun)}
            tone={totalOverrun > 0 ? "negative" : "neutral"}
            icon={FiTrendingUp}
          />
          <TimeTile
            label="Underrun (below plan)"
            value={formatHours(totalUnderrun)}
            tone="positive"
            icon={FiTrendingDown}
          />
        </div>
      </div>
    </PlannerCard>
  );
};

const OverrunsAndSavers = ({ overruns, timeSavers }) => (
  <div className="grid gap-4 xl:grid-cols-2">
    <PlannerCard
      title="Top Time Overruns"
      description="Where Actual Time Went Over Allotted the Most."
    >
      {overruns.length === 0 ? (
        <p className="text-xs italic text-black">
          Nothing went over allotted time. Great.
        </p>
      ) : (
        <ul className="space-y-2">
          {overruns.map((row, idx) => (
            <li
              key={`${row.kind}-${idx}-${row.label}`}
              className="flex items-start gap-3 rounded-lg border border-black bg-white p-2"
            >
              <FiAlertCircle className="mt-1 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-black">
                  {row.label}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-black">
                  {row.kind}
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-red-600 bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                +{formatHours(row.delta)} ({row.deltaPct}%)
              </span>
            </li>
          ))}
        </ul>
      )}
    </PlannerCard>

    <PlannerCard
      title="Top Time Savers"
      description="Where You Came In Faster Than Planned."
    >
      {timeSavers.length === 0 ? (
        <p className="text-xs italic text-black">
          No under-plan completions logged.
        </p>
      ) : (
        <ul className="space-y-2">
          {timeSavers.map((row, idx) => (
            <li
              key={`${row.kind}-${idx}-${row.label}`}
              className="flex items-start gap-3 rounded-lg border border-black bg-white p-2"
            >
              <FiArrowDownCircle className="mt-1 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-black">
                  {row.label}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-black">
                  {row.kind}
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-black bg-black px-2 py-0.5 text-[11px] font-bold text-white">
                −{formatHours(row.delta)} ({row.deltaPct}%)
              </span>
            </li>
          ))}
        </ul>
      )}
    </PlannerCard>
  </div>
);

const LearningsInsights = ({ learnings, watchout }) => (
  <div className="grid gap-4 xl:grid-cols-2">
    <PlannerCard
      title="Learnings — Habits You Stopped"
      description="Did You Actually Cut the Unproductive Things You Committed to Stop?"
    >
      <div className="grid grid-cols-2 gap-2">
        <MiniStat
          icon={FiCheckCircle}
          label="Stopped"
          value={`${learnings.stopped}/${learnings.total}`}
          percent={percent(learnings.stopped, learnings.total)}
        />
        <MiniStat
          icon={FiSlash}
          label="Still Doing"
          value={`${learnings.notStopped}/${learnings.total}`}
          percent={percent(learnings.notStopped, learnings.total)}
        />
        <MiniStat
          icon={FiArrowDownCircle}
          label="Hours Reclaimed"
          value={formatHours(learnings.reclaimedHours)}
          footnote="Estimated, from weekly time on items marked Yes."
        />
        <MiniStat
          icon={FiTrendingDown}
          label="Hours Still Lost"
          value={formatHours(learnings.stillWastedHours)}
          footnote="Estimated, from weekly time on items marked No or blank."
        />
      </div>
    </PlannerCard>

    <PlannerCard
      title="Watch-Outs — Defeated This Week?"
      description="The Reasons You Flagged at the Top of the Week as Threats to Your Goals."
    >
      {watchout.total === 0 ? (
        <p className="text-xs italic text-black">No watch-outs logged this week.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MiniStat
            icon={FiAward}
            label="Defeated"
            value={`${watchout.defeated}/${watchout.total}`}
            percent={percent(watchout.defeated, watchout.total)}
          />
          <MiniStat
            icon={FiXCircle}
            label="Still a problem"
            value={`${watchout.notDefeated}/${watchout.total}`}
            percent={percent(watchout.notDefeated, watchout.total)}
          />
        </div>
      )}
    </PlannerCard>
  </div>
);

const NotesRecap = ({ notes }) => {
  const entries = [
    {
      key: "aResults",
      title: "A. Tangible Results committed",
      learnKey: "aLearning",
    },
    {
      key: "dUnproductive",
      title: "D. Unproductive things to stop",
      learnKey: "dLearning",
    },
    {
      key: "eReasons",
      title: "E. Reasons that kept entertaining",
      learnKey: "eLearning",
    },
  ].filter((e) => (notes[e.key] || notes[e.learnKey] || "").toString().trim().length > 0);
  if (entries.length === 0) return null;
  return (
    <PlannerCard
      title="Reflection Notes"
      description="Your Written Reflections From Learnings."
    >
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.key} className="rounded-lg border border-black bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-black">
              {e.title}
            </p>
            {(notes[e.key] || "").trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-black">
                {notes[e.key]}
              </p>
            ) : null}
            {(notes[e.learnKey] || "").trim() ? (
              <>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-black">
                  Learning
                </p>
                <p className="whitespace-pre-wrap text-sm text-black">
                  {notes[e.learnKey]}
                </p>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </PlannerCard>
  );
};

const MiniStat = ({ icon: Icon, label, value, percent: pct, footnote }) => (
  <div className="rounded-xl border border-black bg-white p-3">
    <div className="flex items-start justify-between">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-black">
        {label}
      </p>
      <span className="rounded-md border border-red-600 bg-red-600 p-1.5 text-white">
        <Icon className="text-sm" />
      </span>
    </div>
    <p className="mt-2 text-xl font-bold text-black">{value}</p>
    {typeof pct === "number" ? (
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full border border-black bg-white">
        <div
          className="h-full rounded-full bg-red-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    ) : null}
    {footnote ? <p className="mt-1 text-[10px] text-black">{footnote}</p> : null}
  </div>
);

const TimeTile = ({ icon: Icon, label, value, tone }) => {
  const accent =
    tone === "negative"
      ? "bg-red-600 text-white border-red-600"
      : tone === "positive"
      ? "bg-black text-white border-black"
      : "bg-white text-black border-black";
  return (
    <div className={`flex items-center justify-between rounded-lg border ${accent} px-3 py-2`}>
      <div className="flex items-center gap-2">
        <Icon className="text-sm" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
};

export default HistoryWorkspace;
