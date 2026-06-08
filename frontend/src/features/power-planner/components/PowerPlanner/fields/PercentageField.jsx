import clsx from "clsx";

const clampPercent = (raw) => {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
};

const PercentageField = ({
  value,
  onChange,
  readOnly = false,
  label = "% Done",
  // True once the user has explicitly entered a score — lets an explicit 0 show
  // as "0" (and stay typeable) instead of falling back to the grey placeholder.
  scored = false,
}) => {
  const percent = Math.round(((value || 0) * 100));

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "inline-flex min-w-[3.25rem] justify-center rounded-md border px-2 py-1 text-xs font-bold",
            percent >= 100
              ? "border-red-600 bg-red-600 text-white"
              : "border-black bg-white text-black"
          )}
          title={`${label} (auto-calculated)`}
        >
          {percent}%
        </span>
        <span className="text-[10px] uppercase tracking-wide text-black">auto</span>
      </div>
    );
  }

  // Show "0" only once the user has actually entered it; otherwise keep the
  // grey "0" placeholder so an untouched field reads as "not scored yet".
  const displayValue = percent === 0 ? (scored ? "0" : "") : String(percent);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        value={displayValue}
        placeholder="0"
        onFocus={(e) => e.target.select()}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            // Cleared back to blank → treat as unscored again.
            onChange(0, false);
            return;
          }
          onChange(clampPercent(raw) / 100, true);
        }}
        className="w-20 rounded-md border border-black bg-white px-2 py-1.5 text-sm font-semibold text-black outline-none focus:border-red-600"
      />
      <span className="text-xs font-semibold text-black">%</span>
    </div>
  );
};

export default PercentageField;
