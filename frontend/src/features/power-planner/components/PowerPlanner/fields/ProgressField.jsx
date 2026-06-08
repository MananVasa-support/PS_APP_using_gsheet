import clsx from "clsx";
import { PROGRESS_OPTIONS } from "../../../data/powerPlannerConstants";
import {
  formatProgressPercent,
  progressTone,
} from "../../../utils/powerPlannerUtils";

const toneClasses = {
  complete: "bg-red-600",
  high: "bg-red-500",
  mid: "bg-zinc-700",
  low: "bg-zinc-400",
};

const ProgressField = ({ value, onChange, compact = false }) => {
  const tone = progressTone(value);

  return (
    <div className={clsx("space-y-2", compact && "space-y-1")}>
      <div className="flex items-center justify-between gap-2">
        <span className="powerplanner-progress-pill inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          {formatProgressPercent(value)}
        </span>
        <select
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="powerplanner-select w-full max-w-[5.5rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
        >
          {PROGRESS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={clsx("h-full rounded-full transition-all duration-300", toneClasses[tone])}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressField;
