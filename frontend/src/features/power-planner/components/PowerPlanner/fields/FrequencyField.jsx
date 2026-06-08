import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FiArrowLeft, FiRepeat, FiChevronDown } from "react-icons/fi";
import {
  FREQUENCY_OPTIONS,
  isRecurring,
  describeRecurrence,
} from "../../../utils/recurrence";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
// 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th" …
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

// The date-specific label for weekly / monthly / annually, mirroring Google
// Calendar: "Weekly on Wednesday", "Monthly on the 3rd", "Annually on June 3".
// Returns null for frequencies that don't depend on the date (daily, custom, …).
const specificLabel = (freq, dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if ([y, m, d].some(Number.isNaN)) return null;
  const dt = new Date(y, m - 1, d);
  if (freq === "weekly") return `Weekly on ${WEEKDAY_NAMES[dt.getDay()]}`;
  if (freq === "monthly") return `Monthly on the ${ordinal(d)}`;
  if (freq === "quarterly") return `Quarterly on the ${ordinal(d)}`;
  if (freq === "annually") return `Annually on ${MONTH_NAMES[m - 1]} ${d}`;
  return null;
};

// Compact frequency control. The column only shows a small button; the editor
// opens as a centered popup so the table column can stay narrow. Generated
// copies pass `isRepeat` and just show a read-only badge.
//
// The popup edits a LOCAL DRAFT — Esc, the backdrop and the Back arrow all
// cancel (discarding the draft and leaving the saved choice untouched); only
// "Done" writes the chosen schedule back to the row.
const FrequencyField = ({
  frequency = "once",
  recurEnd = { type: "never", count: 6, until: "" },
  recurCustom = { interval: 2, unit: "weeks" },
  recurDays = [],
  isRepeat = false,
  seriesLabel = "",
  targetDate = "",
  // Label for the collapsed button / popup heading ("goal" vs "sub-action").
  whatLabel = "task",
  // Which frequencies to offer (null = all). Results restrict this set so a
  // weekly-deadline goal can't pick "daily"; Actions get the full set.
  allowedFrequencies = null,
  // Which "Ends" choices to offer: any of "never" | "count" | "until".
  allowedEnds = ["never", "count", "until"],
  // For an ACTION that repeats on its own schedule: show the "same goal name vs
  // blank goal" choice for the carrier row in other weeks.
  showCarrierChoice = false,
  carrierBlank = false,
  onChange, // (field, value)
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    frequency,
    recurEnd,
    recurCustom,
    recurDays,
    carrierBlank,
  });

  const openEditor = () => {
    setDraft({
      frequency,
      recurEnd: recurEnd || { type: "never", count: 6, until: "" },
      recurCustom: recurCustom || { interval: 2, unit: "weeks" },
      recurDays: Array.isArray(recurDays) ? recurDays : [],
      carrierBlank: !!carrierBlank,
    });
    setOpen(true);
  };
  const cancelEditor = () => setOpen(false); // discard the draft
  const commitEditor = () => {
    onChange("frequency", draft.frequency);
    onChange("recurEnd", draft.recurEnd);
    onChange("recurCustom", draft.recurCustom);
    onChange("recurDays", draft.recurDays || []);
    if (showCarrierChoice) onChange("carrierBlank", !!draft.carrierBlank);
    setOpen(false);
  };

  // Esc cancels (does not commit).
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === "Escape") cancelEditor();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open]);

  // All hooks MUST run before any early return (rules-of-hooks).
  const dynamicOptions = useMemo(() => {
    const base = allowedFrequencies
      ? FREQUENCY_OPTIONS.filter((o) => allowedFrequencies.includes(o.value))
      : FREQUENCY_OPTIONS;
    return base.map((opt) => {
      const label = specificLabel(opt.value, targetDate);
      return label ? { ...opt, label } : opt;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, (allowedFrequencies || []).join(",")]);

  // --- Early returns (after all hooks) ---

  if (isRepeat) {
    return (
      <div className="space-y-0.5">
        <span
          className="inline-flex items-center gap-1 rounded-md border border-black bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black"
          title={
            seriesLabel
              ? `Auto-created repeat · ${seriesLabel}. Edit the original to change its schedule.`
              : "A repeat of a recurring task. Edit the original to change its schedule."
          }
        >
          <FiRepeat className="text-[11px]" />
          Repeated
        </span>
        {seriesLabel ? (
          <p className="truncate text-[10px] text-black/50">{seriesLabel}</p>
        ) : null}
      </div>
    );
  }

  // Hide frequency button when no target date is set.
  if (!targetDate) {
    return <span className="text-xs text-black/40">—</span>;
  }

  // Collapsed-button label reflects the COMMITTED (saved-on-row) values.
  const describe = (freq, end) => {
    const base = specificLabel(freq, targetDate);
    if (base) {
      const endType = (end || {}).type || "never";
      if (endType === "count") return `${base} · ${end.count || 1} times`;
      if (endType === "until" && end.until) return `${base} · until ${end.until}`;
      return base;
    }
    return describeRecurrence(freq, end, recurCustom, recurDays);
  };
  const committedEnd = recurEnd || { type: "never", count: 6, until: "" };
  const recurring = isRecurring(frequency);

  // Inside the popup everything reads/writes the DRAFT, so the preview updates
  // live and a cancel throws it all away.
  const dFreq = draft.frequency;
  const dEnd = draft.recurEnd || { type: "never", count: 6, until: "" };
  const dCustom = draft.recurCustom || { interval: 2, unit: "weeks" };
  const dRecurring = isRecurring(dFreq);
  const setFreq = (value) => setDraft((d) => ({ ...d, frequency: value }));
  const setEnd = (patch) =>
    setDraft((d) => ({
      ...d,
      recurEnd: { ...(d.recurEnd || { type: "never", count: 6, until: "" }), ...patch },
    }));
  const setCustom = (patch) =>
    setDraft((d) => ({
      ...d,
      recurCustom: { ...(d.recurCustom || { interval: 2, unit: "weeks" }), ...patch },
    }));
  const dDays = Array.isArray(draft.recurDays) ? draft.recurDays : [];
  const toggleDay = (wd) =>
    setDraft((d) => {
      const cur = Array.isArray(d.recurDays) ? d.recurDays : [];
      return {
        ...d,
        recurDays: cur.includes(wd)
          ? cur.filter((x) => x !== wd)
          : [...cur, wd],
      };
    });
  // Mon-first display, mapped to JS weekday numbers (0=Sun … 6=Sat).
  const WEEKDAY_PICKER = [
    { wd: 1, label: "M" },
    { wd: 2, label: "T" },
    { wd: 3, label: "W" },
    { wd: 4, label: "T" },
    { wd: 5, label: "F" },
    { wd: 6, label: "S" },
    { wd: 0, label: "S" },
  ];
  const showDayPicker = dFreq === "custom" && dCustom.unit === "weeks";

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className={`flex w-full items-center justify-between gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
          recurring
            ? "border-red-600 bg-red-600 text-white"
            : "border-black bg-white text-black hover:bg-black hover:text-white"
        }`}
        title={recurring ? describe(frequency, committedEnd) : "Set how this repeats"}
      >
        <span className="flex items-center gap-1 truncate">
          <FiRepeat className="shrink-0 text-[11px]" />
          <span className="truncate">
            {recurring ? describe(frequency, committedEnd) : "Once"}
          </span>
        </span>
        <FiChevronDown className="shrink-0 text-[11px]" />
      </button>

      {open ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={cancelEditor}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-black bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEditor}
                className="inline-flex items-center justify-center rounded-lg border border-black bg-white p-1.5 text-black transition hover:bg-red-600 hover:border-red-600 hover:text-white"
                title="Cancel (discard changes)"
              >
                <FiArrowLeft className="text-sm" />
              </button>
              <FiRepeat className="text-red-600" />
              <h3 className="text-base font-bold text-black">Repeat schedule</h3>
            </div>

            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-black/50">
              Repeats
            </label>
            <select
              value={dFreq}
              onChange={(e) => setFreq(e.target.value)}
              className="w-full rounded-lg border border-black bg-white px-2.5 py-2 text-sm"
            >
              {dynamicOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {dFreq === "custom" ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-black">Every</span>
                <input
                  type="number"
                  min={1}
                  value={dCustom.interval}
                  onChange={(e) =>
                    setCustom({ interval: Math.max(1, Number(e.target.value) || 1) })
                  }
                  className="w-16 rounded-lg border border-black bg-white px-2 py-1.5 text-sm"
                />
                <select
                  value={dCustom.unit}
                  onChange={(e) => setCustom({ unit: e.target.value })}
                  className="rounded-lg border border-black bg-white px-2 py-1.5 text-sm"
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
              </div>
            ) : null}

            {showDayPicker ? (
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-black/50">
                  Repeat on
                </label>
                <div className="flex gap-1.5">
                  {WEEKDAY_PICKER.map(({ wd, label }) => {
                    const on = dDays.includes(wd);
                    return (
                      <button
                        key={wd}
                        type="button"
                        onClick={() => toggleDay(wd)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                          on
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-black bg-white text-black hover:bg-zinc-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {dRecurring ? (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-black/50">
                  Ends
                </label>
                <div className="space-y-2">
                  {allowedEnds.includes("never") ? (
                  <label className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-red-600"
                      checked={dEnd.type === "never"}
                      onChange={() => setEnd({ type: "never" })}
                    />
                    Never
                  </label>
                  ) : null}
                  {allowedEnds.includes("count") ? (
                  <label className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-red-600"
                      checked={dEnd.type === "count"}
                      onChange={() => setEnd({ type: "count" })}
                    />
                    After
                    <input
                      type="number"
                      min={1}
                      value={dEnd.count}
                      onChange={(e) =>
                        setEnd({
                          type: "count",
                          count: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-16 rounded-md border border-black bg-white px-2 py-1 text-sm"
                    />
                    times
                  </label>
                  ) : null}
                  {allowedEnds.includes("until") ? (
                  <label className="flex items-center gap-2 text-sm text-black">
                    <input
                      type="radio"
                      className="h-4 w-4 accent-red-600"
                      checked={dEnd.type === "until"}
                      onChange={() => setEnd({ type: "until" })}
                    />
                    On
                    <input
                      type="date"
                      value={dEnd.until}
                      min={targetDate || undefined}
                      onChange={(e) => {
                        // An end date before the start makes no sense — clamp it
                        // to the target date so the schedule always has ≥1 date.
                        const v =
                          e.target.value && targetDate && e.target.value < targetDate
                            ? targetDate
                            : e.target.value;
                        setEnd({ type: "until", until: v });
                      }}
                      className="rounded-md border border-black bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  ) : null}
                </div>
              </div>
            ) : null}

            {showCarrierChoice && dRecurring ? (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-black/50">
                  In other weeks, repeat under
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm text-black">
                    <input
                      type="radio"
                      className="mt-0.5 h-4 w-4 accent-red-600"
                      checked={!draft.carrierBlank}
                      onChange={() =>
                        setDraft((d) => ({ ...d, carrierBlank: false }))
                      }
                    />
                    <span>
                      The same Result
                      <span className="block text-[11px] text-black/50">
                        copies this Result&apos;s name &amp; details
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-black">
                    <input
                      type="radio"
                      className="mt-0.5 h-4 w-4 accent-red-600"
                      checked={!!draft.carrierBlank}
                      onChange={() =>
                        setDraft((d) => ({ ...d, carrierBlank: true }))
                      }
                    />
                    <span>
                      Create a new Result
                      <span className="block text-[11px] text-black/50">
                        a blank Result row to fill each week
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={commitEditor}
              className="mt-4 w-full rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-black hover:border-black"
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
};

export default FrequencyField;
