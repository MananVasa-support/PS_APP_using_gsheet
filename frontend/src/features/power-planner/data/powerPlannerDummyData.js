export const powerPlannerSummary = {
  heading: "Power Planner",
  description: "Centralized planning workspace for goals, priorities, and execution.",
  periodLabel: "This Week",
};

export const powerPlannerStats = [
  {
    id: "focus-hours",
    label: "Focus Hours",
    value: "28h",
    trend: "+6.4%",
    trendDirection: "up",
  },
  {
    id: "tasks-scheduled",
    label: "Tasks Scheduled",
    value: "42",
    trend: "+3.1%",
    trendDirection: "up",
  },
  {
    id: "blocks-complete",
    label: "Blocks Complete",
    value: "17",
    trend: "-1.2%",
    trendDirection: "down",
  },
  {
    id: "team-load",
    label: "Team Load",
    value: "73%",
    trend: "Stable",
    trendDirection: "neutral",
  },
];

export const powerPlannerSections = [
  {
    id: "priority-queue",
    title: "Priority Queue",
    description: "Placeholder for ranked high-impact initiatives.",
    items: ["Roadmap alignment slot", "Stakeholder dependency check", "Risk review checkpoint"],
  },
  {
    id: "time-blocks",
    title: "Time Blocks",
    description: "Placeholder for structured schedule windows and ownership.",
    items: ["Morning deep work block", "Cross-team sync window", "Delivery validation buffer"],
  },
  {
    id: "resource-balance",
    title: "Resource Balance",
    description: "Placeholder for capacity and allocation overview.",
    items: ["Engineering bandwidth lane", "Operations support lane", "Escalation coverage lane"],
  },
];

export const powerPlannerChartSeed = [
  { name: "Mon", planned: 5, completed: 3 },
  { name: "Tue", planned: 6, completed: 4 },
  { name: "Wed", planned: 4, completed: 3 },
  { name: "Thu", planned: 7, completed: 5 },
  { name: "Fri", planned: 5, completed: 4 },
];
