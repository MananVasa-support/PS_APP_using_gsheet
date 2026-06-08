export const parseDurationParts = (value) => {
  if (!value) return { hours: "", minutes: "" };
  const s = String(value).toLowerCase();
  const hMatch = s.match(/([\d.]+)\s*h/);
  const mMatch = s.match(/([\d.]+)\s*m/);
  if (hMatch || mMatch) {
    return {
      hours: hMatch ? hMatch[1].replace(/\.0+$/, "") : "",
      minutes: mMatch ? mMatch[1].replace(/\.0+$/, "") : "",
    };
  }
  const numeric = parseFloat(s);
  if (Number.isNaN(numeric)) return { hours: "", minutes: "" };
  return { hours: "", minutes: String(numeric) };
};

export const formatDuration = (hours, minutes) => {
  const rawH = parseInt(hours, 10);
  const rawM = parseInt(minutes, 10);
  const h = Number.isNaN(rawH) ? 0 : Math.max(0, rawH);
  const m = Number.isNaN(rawM) ? 0 : Math.max(0, rawM);
  if (h === 0 && m === 0) return "";
  const parts = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "min" : "mins"}`);
  return parts.join(" ");
};

const fieldClass =
  "rounded-lg border border-black/15 bg-white px-2 py-2 text-sm text-black focus:border-red-600 focus:outline-none";

const clampMinutes = (raw) => {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return "";
  if (n < 0) return "0";
  if (n > 59) return "59";
  return String(n);
};

const DurationField = ({ value, onChange, className = "" }) => {
  const { hours, minutes } = parseDurationParts(value);

  const emit = (nextHours, nextMinutes) => {
    onChange(formatDuration(nextHours, nextMinutes));
  };

  const handleHoursChange = (e) => {
    emit(e.target.value, minutes);
  };

  const handleMinutesChange = (e) => {
    emit(hours, clampMinutes(e.target.value));
  };

  return (
    <div className={`flex w-full items-center gap-1 ${className}`}>
      <input
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        placeholder="0"
        value={hours}
        onChange={handleHoursChange}
        onWheel={(e) => e.currentTarget.blur()}
        className={`${fieldClass} w-12`}
        aria-label="Hours"
      />
      <span className="text-xs font-semibold text-black/60">h</span>
      <input
        type="number"
        min="0"
        max="59"
        step="1"
        inputMode="numeric"
        placeholder="0"
        value={minutes}
        onChange={handleMinutesChange}
        onWheel={(e) => e.currentTarget.blur()}
        className={`${fieldClass} w-12`}
        aria-label="Minutes"
      />
      <span className="text-xs font-semibold text-black/60">m</span>
    </div>
  );
};

export default DurationField;
