import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPieChart,
} from "react-icons/fi";

// Landing screen shown before the planner. Each option leads into the planner
// at the matching section (Totality is a placeholder for now).
const OPTIONS = [
  {
    id: "start",
    label: "Start Planning",
    description: "Set Weekly Goals and Schedule",
    icon: FiCalendar,
  },
  {
    id: "review",
    label: "Review Plan",
    description: "Score How Much You Achieved",
    icon: FiCheckCircle,
  },
  {
    id: "history",
    label: "History",
    description: "Look Back at Insights From Past Weeks.",
    icon: FiClock,
  },
  {
    id: "totality",
    label: "Totality",
    description: "Fill Out This Form",
    icon: FiPieChart,
  },
];

const PlannerStart = ({ heading = "Power Planner", onSelect }) => {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 md:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-black md:text-4xl">
          {heading}
        </h1>
        <p className="mt-2 text-sm text-black">
          What Would You Like to Do?
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map((opt, index) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => onSelect?.(opt.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className="group flex w-full items-center gap-4 rounded-2xl border border-black bg-white px-5 py-4 text-left transition-colors duration-150 hover:bg-black"
            >
              <span className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-600 bg-red-600 p-3 text-white">
                <Icon className="text-xl" />
              </span>
              <span className="flex-1">
                <span className="block text-base font-bold text-black group-hover:text-white">
                  {opt.label}
                </span>
                <span className="block text-xs text-black group-hover:text-zinc-300">
                  {opt.description}
                </span>
              </span>
              <FiArrowRight className="shrink-0 text-lg text-black group-hover:text-white" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default PlannerStart;
