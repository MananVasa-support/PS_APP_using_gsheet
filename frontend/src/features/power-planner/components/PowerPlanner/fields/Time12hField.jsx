import clsx from "clsx";

const parse24hToParts = (value) => {
  if (!value || typeof value !== "string") return { hour: "", minute: "", ampm: "AM" };
  const [hhRaw, mmRaw] = value.split(":");
  const hh = parseInt(hhRaw, 10);
  const mm = parseInt(mmRaw, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return { hour: "", minute: "", ampm: "AM" };
  const ampm = hh >= 12 ? "PM" : "AM";
  let hour12 = hh % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour: String(hour12), minute: String(mm).padStart(2, "0"), ampm };
};

const partsTo24h = (hour, minute, ampm) => {
  const hh = parseInt(hour, 10);
  const mm = parseInt(minute, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return "";
  const h12 = Math.min(12, Math.max(1, hh));
  const m = Math.min(59, Math.max(0, mm));
  let hh24 = h12 % 12;
  if (ampm === "PM") hh24 += 12;
  return `${String(hh24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const clampHour = (raw) => {
  if (raw === "") return "";
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return "";
  if (n < 1) return "1";
  if (n > 12) return "12";
  return String(n);
};

const clampMinute = (raw) => {
  if (raw === "") return "";
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return "";
  if (n < 0) return "0";
  if (n > 59) return "59";
  return String(n);
};

const Time12hField = ({ value, onChange, readOnly = false, className = "" }) => {
  const { hour, minute, ampm } = parse24hToParts(value);

  const emit = (h, m, ap) => {
    if (h === "" && m === "") {
      onChange("");
      return;
    }
    const next = partsTo24h(h || "12", m || "0", ap);
    onChange(next);
  };

  const inputClass =
    "w-12 rounded border border-black bg-white px-1 py-1 text-center text-xs font-semibold text-black outline-none focus:border-red-600";
  const readOnlyClass =
    "w-12 cursor-not-allowed rounded border border-black bg-white px-1 py-1 text-center text-xs font-semibold text-black";

  if (readOnly) {
    return (
      <div className={clsx("flex items-center gap-0.5", className)}>
        <span className={readOnlyClass}>{hour || "--"}</span>
        <span className="text-xs">:</span>
        <span className={readOnlyClass}>{minute || "--"}</span>
        <span className="ml-1 rounded border border-black bg-white px-1.5 py-1 text-[10px] font-bold text-black">
          {ampm}
        </span>
      </div>
    );
  }

  return (
    <div className={clsx("flex items-center gap-0.5", className)}>
      <input
        type="number"
        min={1}
        max={12}
        step={1}
        inputMode="numeric"
        placeholder="--"
        value={hour}
        onFocus={(e) => e.target.select()}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => {
          const next = clampHour(e.target.value);
          emit(next, minute, ampm);
        }}
        className={inputClass}
        aria-label="Hour"
      />
      <span className="text-xs font-bold">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={1}
        inputMode="numeric"
        placeholder="--"
        value={minute}
        onFocus={(e) => e.target.select()}
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => {
          const next = clampMinute(e.target.value);
          emit(hour, next, ampm);
        }}
        className={inputClass}
        aria-label="Minute"
      />
      <button
        type="button"
        onClick={() => emit(hour, minute, ampm === "AM" ? "PM" : "AM")}
        className={clsx(
          "ml-1 rounded border px-1.5 py-1 text-[10px] font-bold transition",
          ampm === "PM"
            ? "border-red-600 bg-red-600 text-white"
            : "border-black bg-white text-black hover:bg-black hover:text-white"
        )}
        title="Toggle AM/PM"
        aria-label="AM/PM"
      >
        {ampm}
      </button>
    </div>
  );
};

export default Time12hField;
