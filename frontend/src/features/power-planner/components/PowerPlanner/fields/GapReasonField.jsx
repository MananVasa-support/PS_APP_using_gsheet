import {
  GAP_REASON_OPTIONS,
  GAP_REASON_SUBCATEGORIES,
  GAP_REASON_FULL_LABEL,
} from "../../../data/powerPlannerConstants";
import { normalizeGapReason } from "../../../utils/powerPlannerUtils";

// Two-level TFCR picker. The top row toggles the four reasons (Time / Focus /
// Clarity / Reality). Selecting one reveals ITS sub-categories underneath; any
// number can be picked, across any number of reasons. The value is stored as
// `{ Time: ["Started Late"], Clarity: [...] }` — a present key = that reason is
// on; its array = the chosen sub-categories.
const GapReasonField = ({ value, onChange, compact = false }) => {
  const selected = normalizeGapReason(value);

  const toggleTop = (reason) => {
    const next = { ...selected };
    if (reason in next) delete next[reason];
    else next[reason] = [];
    onChange(next);
  };

  const toggleSub = (reason, sub) => {
    const current = selected[reason] || [];
    const isOn = current.includes(sub);
    onChange({
      ...selected,
      [reason]: isOn ? current.filter((s) => s !== sub) : [...current, sub],
    });
  };

  return (
    <div
      className={`powerplanner-tfcr space-y-2 ${
        compact ? "" : "rounded-lg border border-zinc-200 bg-white p-1.5"
      }`}
      role="group"
      aria-label="TFCR reasons"
    >
      <div className="flex flex-wrap gap-1.5">
        {GAP_REASON_OPTIONS.map((reason) => {
          const isOn = reason in selected;
          return (
            <button
              key={reason}
              type="button"
              onClick={() => toggleTop(reason)}
              aria-pressed={isOn}
              title={GAP_REASON_FULL_LABEL[reason]}
              className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                isOn
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-black bg-white text-black hover:bg-black hover:text-white"
              }`}
            >
              {reason}
            </button>
          );
        })}
      </div>

      {GAP_REASON_OPTIONS.filter((reason) => reason in selected).map((reason) => (
        <div
          key={reason}
          className="rounded-lg border border-red-200 bg-red-50/40 p-2"
        >
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
            {GAP_REASON_FULL_LABEL[reason]} — what exactly?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {GAP_REASON_SUBCATEGORIES[reason].map((sub) => {
              const isOn = (selected[reason] || []).includes(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggleSub(reason, sub)}
                  aria-pressed={isOn}
                  className={`rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                    isOn
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 bg-white text-black hover:border-black"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GapReasonField;
