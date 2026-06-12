import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { parseDurationToHours } from "../../utils/powerPlannerUtils";
import { todayISO, formatLongDate } from "../../utils/weekDates";

// Lags `value` by `delay` ms. Used so the TFCR/reason row only decides to show
// ~1s after the user stops typing a % — typing "1" on the way to "100" won't
// flash the reason row for a fraction of a second.
const useDebouncedValue = (value, delay = 1000) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
};
import DurationField from "./fields/DurationField";
import GapReasonField from "./fields/GapReasonField";
import PercentageField from "./fields/PercentageField";
import PlannerCard from "./PlannerCard";

const inputClass =
  "powerplanner-input w-full rounded-lg border border-black bg-white px-2 py-1.5 text-sm outline-none focus:border-red-600";

const formatProgress = (p) => `${Math.round((p || 0) * 100)}%`;

// Big, clearly-clickable Yes/No toggle used in the Learnings section.
const YesNoToggle = ({ value, onChange }) => (
  <div className="inline-flex overflow-hidden rounded-xl border-2 border-black">
    <button
      type="button"
      onClick={() => onChange("yes")}
      className={`px-6 py-2.5 text-sm font-bold transition ${
        value === "yes"
          ? "bg-red-600 text-white"
          : "bg-white text-black hover:bg-zinc-100"
      }`}
    >
      Yes
    </button>
    <button
      type="button"
      onClick={() => onChange("no")}
      className={`border-l-2 border-black px-6 py-2.5 text-sm font-bold transition ${
        value === "no"
          ? "bg-black text-white"
          : "bg-white text-black hover:bg-zinc-100"
      }`}
    >
      No
    </button>
  </div>
);

const formatHours = (h) => {
  if (!h || h <= 0) return "—";
  const total = h * 60;
  const hours = Math.floor(total / 60);
  const mins = Math.round(total - hours * 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

const formatDate = (date) => {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.valueOf())) return date;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
};

const reasonModeLabel = (mode) => {
  if (mode === "overtime") return "Why the delay — what took more time?";
  if (mode === "both") return "Reasons (not finished AND took longer than allotted)";
  return "Reasons why not done";
};
const reasonModePlaceholder = () => "What got in the way (Reason)";

const ReasonRow = ({ colSpan, mode, tfcr, reason, onChangeTfcr, onChangeReason }) => (
  <tr className="border-b border-black bg-white">
    <td colSpan={colSpan} className="px-3 py-3">
      <div className="space-y-2 rounded-lg border border-black bg-white p-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-black">
            TFCR — pick what got in the way
          </label>
          <GapReasonField compact value={tfcr} onChange={onChangeTfcr} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-black">
            {reasonModeLabel(mode)}
          </label>
          <textarea
            rows={2}
            className={`${inputClass} resize-y`}
            placeholder={reasonModePlaceholder(mode)}
            value={reason || ""}
            onChange={(e) => onChangeReason(e.target.value)}
          />
        </div>
      </div>
    </td>
  </tr>
);

// A row counts as "scored" once the user explicitly entered a % (the `scored`
// flag) — OR, for older data saved before that flag existed, whenever its
// progress is above 0. This is what lets an explicit 0% open the TFCR row.
const effScored = (row) => row?.scored === true || (row?.progress || 0) > 0;

const reasonMode = (scored, progress, allottedHours, actualHours) => {
  const incomplete = (progress || 0) < 1;
  const overtime = allottedHours > 0 && actualHours > allottedHours;
  // No score entered and nothing overran → keep the row clean.
  if (!scored && !overtime) return null;
  if (incomplete && overtime) return "both";
  if (overtime) return "overtime";
  if (incomplete) return "incomplete";
  return null;
};

const findById = (list, id) => list.find((row) => row.id === id);

// Small Category / Purpose chips shown next to a task in Review. A sub-action
// with no category of its own falls back to its parent goal's category.
const resolveTag = (val, custom) => (val === "Other" ? custom : val) || "";
const TagChips = ({ category, customCategory, purpose, customPurpose }) => {
  const cat = resolveTag(category, customCategory);
  const pur = resolveTag(purpose, customPurpose);
  if (!cat && !pur) return null;
  return (
    <span className="mr-2 inline-flex flex-wrap gap-1 align-middle">
      {cat ? (
        <span className="rounded border border-black bg-white px-1.5 py-0.5 text-[10px] font-semibold text-black">
          {cat}
        </span>
      ) : null}
      {pur ? (
        <span className="rounded border border-red-600 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
          {pur}
        </span>
      ) : null}
    </span>
  );
};

const TopGoalsTable = ({
  savedCommitments,
  savedActions,
  draftCommitments,
  draftActions,
  onUpdateCommitment,
  onUpdateAction,
}) => {
  // Debounced snapshot of every row's % so the reason row only reacts ~1s after
  // typing stops (avoids the flash while typing "1" → "100").
  const liveProgress = useMemo(() => {
    const m = {};
    savedCommitments.forEach((p) => {
      const d = findById(draftCommitments, p.id) || p;
      m[p.id] = { p: d.progress || 0, s: effScored(d) };
    });
    savedActions.forEach((s) => {
      const d = findById(draftActions, s.id) || s;
      m[s.id] = { p: d.progress || 0, s: effScored(d) };
    });
    return m;
  }, [savedCommitments, savedActions, draftCommitments, draftActions]);
  const settledProgress = useDebouncedValue(JSON.stringify(liveProgress));
  const settled = useMemo(() => JSON.parse(settledProgress), [settledProgress]);

  if (!savedCommitments || savedCommitments.length === 0) {
    return (
      <PlannerCard title="Top Goals">
        <p className="text-xs text-black">
          No saved Top Goals yet. Save your Top Goals to score them here.
        </p>
      </PlannerCard>
    );
  }

  return (
    <PlannerCard
      title="Top Goals"
      description="Score Your Results and Actions."
      className="overflow-hidden p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
            <tr className="border-b border-black">
              <th className="px-3 py-2">R / A</th>
              <th className="px-3 py-2">
                <span className="ml-20 inline-block">Goal</span>
              </th>
              <th className="px-3 py-2">Allotted</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2 text-right">% Done</th>
            </tr>
          </thead>
          <tbody>
            {savedCommitments.map((parent, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const subs = savedActions.filter(
                (a) => a.parentCommitmentId === parent.id
              );
              // Goal RESULT % is typed by the user (draft value), not auto-calc.
              const draftParent = findById(draftCommitments, parent.id) || parent;
              const parentLabel = parent.result?.trim() ? parent.result : "";
              // Show TFCR + reason for the GOAL when its result is below 100%
              // (after a score is entered). Goals have no time tracking, so pass
              // 0 allotted/actual — this yields "incomplete" only. Uses the
              // debounced % so it won't flash while typing toward 100.
              const parentPS = settled[parent.id] || {
                p: draftParent.progress || 0,
                s: effScored(draftParent),
              };
              const parentMode = reasonMode(parentPS.s, parentPS.p, 0, 0);
              return (
                <Fragment key={parent.id}>
                  <tr className="border-b-2 border-black bg-zinc-50 align-middle">
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-md bg-black px-2 py-0.5 text-[11px] font-bold text-white">
                        {letter}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-semibold text-black">
                      <TagChips
                        category={parent.category}
                        customCategory={parent.customCategory}
                        purpose={parent.purpose}
                        customPurpose={parent.customPurpose}
                      />
                      {parentLabel}
                    </td>
                    <td className="px-3 py-2 text-xs text-black">
                      {formatDate(parent.targetDate)}
                    </td>
                    <td className="px-3 py-2 text-xs text-black">—</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex">
                        <PercentageField
                          value={draftParent.progress}
                          scored={effScored(draftParent)}
                          onChange={(val, sc) => {
                            onUpdateCommitment(parent.id, "progress", val);
                            onUpdateCommitment(parent.id, "scored", sc);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                  {parentMode ? (
                    <ReasonRow
                      colSpan={5}
                      mode={parentMode}
                      tfcr={draftParent.gapReason}
                      reason={draftParent.reasonNotDone}
                      onChangeTfcr={(val) =>
                        onUpdateCommitment(parent.id, "gapReason", val)
                      }
                      onChangeReason={(val) =>
                        onUpdateCommitment(parent.id, "reasonNotDone", val)
                      }
                    />
                  ) : null}

                  {subs.map((savedSub, sIdx) => {
                    // Use draft values for editable fields (so user sees their typing)
                    const sub = findById(draftActions, savedSub.id) || savedSub;
                    const subLabel = savedSub.description?.trim()
                      ? savedSub.description
                      : "";
                    const allottedHours = parseDurationToHours(savedSub.duration);
                    const actualHours = parseDurationToHours(sub.actualDuration);
                    const subPS = settled[savedSub.id] || {
                      p: sub.progress || 0,
                      s: effScored(sub),
                    };
                    const mode = reasonMode(
                      subPS.s,
                      subPS.p,
                      allottedHours,
                      actualHours
                    );
                    const isOvertime = allottedHours > 0 && actualHours > allottedHours;
                    return (
                      <Fragment key={savedSub.id}>
                        <tr
                          id={`review-task-${savedSub.id}`}
                          className="border-b border-black align-middle hover:bg-white"
                        >
                          <td className="px-3 py-2">
                            <span className="ml-3 inline-flex rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {`${letter}${sIdx + 1}`}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-black">
                            <TagChips
                              category={savedSub.category || parent.category}
                              customCategory={
                                savedSub.category
                                  ? savedSub.customCategory
                                  : parent.customCategory
                              }
                              purpose={savedSub.purpose || parent.purpose}
                              customPurpose={
                                savedSub.purpose
                                  ? savedSub.customPurpose
                                  : parent.customPurpose
                              }
                            />
                            {subLabel}
                          </td>
                          <td className="px-3 py-2 text-xs text-black">
                            {formatHours(allottedHours)}
                          </td>
                          <td className="px-3 py-2">
                            <DurationField
                              value={sub.actualDuration}
                              onChange={(next) =>
                                onUpdateAction(savedSub.id, "actualDuration", next)
                              }
                            />
                            {isOvertime ? (
                              <p className="mt-1 text-[10px] font-semibold text-red-600">
                                ⚠ over allotted time
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex">
                              <PercentageField
                                value={sub.progress}
                                scored={effScored(sub)}
                                onChange={(val, sc) => {
                                  onUpdateAction(savedSub.id, "progress", val);
                                  onUpdateAction(savedSub.id, "scored", sc);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                        {mode ? (
                          <ReasonRow
                            colSpan={5}
                            mode={mode}
                            tfcr={sub.gapReason}
                            reason={sub.reasonNotDone}
                            onChangeTfcr={(val) =>
                              onUpdateAction(savedSub.id, "gapReason", val)
                            }
                            onChangeReason={(val) =>
                              onUpdateAction(savedSub.id, "reasonNotDone", val)
                            }
                          />
                        ) : null}
                      </Fragment>
                    );
                  })}
                  {subs.length === 0 ? (
                    <tr className="border-b border-black">
                      <td colSpan={5} className="px-3 py-2 text-[11px] italic text-black">
                        No actions for this goal.
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PlannerCard>
  );
};

const OtherThingsReviewTable = ({
  savedItems,
  draftItems,
  onUpdateItem,
}) => {
  // Debounced %s so the reason row only reacts ~1s after typing stops.
  const liveProgress = useMemo(() => {
    const m = {};
    savedItems.forEach((it) => {
      const d = findById(draftItems, it.id) || it;
      m[it.id] = { p: d.progress || 0, s: effScored(d) };
    });
    return m;
  }, [savedItems, draftItems]);
  const settledProgress = useDebouncedValue(JSON.stringify(liveProgress));
  const settled = useMemo(() => JSON.parse(settledProgress), [settledProgress]);

  if (!savedItems || savedItems.length === 0) {
    return (
      <PlannerCard title="Other Things">
        <p className="text-xs text-black">
          No saved Other Things yet. Save them first to score here.
        </p>
      </PlannerCard>
    );
  }

  return (
    <PlannerCard
      title="Other Things"
      description="Score Each Saved Item and Log the Actual Time It Took."
      className="overflow-hidden p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
            <tr className="border-b border-black">
              <th className="px-3 py-2">R</th>
              <th className="px-3 py-2">
                <span className="ml-20 inline-block">Item</span>
              </th>
              <th className="px-3 py-2">Allotted</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2 text-right">% Done</th>
            </tr>
          </thead>
          <tbody>
            {savedItems.map((savedItem, idx) => {
              const item = findById(draftItems, savedItem.id) || savedItem;
              const letter = String.fromCharCode(65 + idx);
              const label = savedItem.result?.trim() ? savedItem.result : "";
              const allottedHours = parseDurationToHours(savedItem.duration);
              const actualHours = parseDurationToHours(item.actualDuration);
              const itemPS = settled[savedItem.id] || {
                p: item.progress || 0,
                s: effScored(item),
              };
              const mode = reasonMode(
                itemPS.s,
                itemPS.p,
                allottedHours,
                actualHours
              );
              const isOvertime = allottedHours > 0 && actualHours > allottedHours;
              return (
                <Fragment key={savedItem.id}>
                  <tr
                    id={`review-task-${savedItem.id}`}
                    className="border-b border-black align-middle hover:bg-white"
                  >
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-md bg-black px-2 py-0.5 text-[11px] font-bold text-white">
                        {letter}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-black">
                      <TagChips
                        category={savedItem.category}
                        customCategory={savedItem.customCategory}
                        purpose={savedItem.purpose}
                        customPurpose={savedItem.customPurpose}
                      />
                      {label}
                    </td>
                    <td className="px-3 py-2 text-xs text-black">
                      {formatHours(allottedHours)}
                    </td>
                    <td className="px-3 py-2">
                      <DurationField
                        value={item.actualDuration}
                        onChange={(next) =>
                          onUpdateItem(savedItem.id, "actualDuration", next)
                        }
                      />
                      {isOvertime ? (
                        <p className="mt-1 text-[10px] font-semibold text-red-600">
                          ⚠ over allotted time
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex">
                        <PercentageField
                          value={item.progress}
                          scored={effScored(item)}
                          onChange={(val, sc) => {
                            onUpdateItem(savedItem.id, "progress", val);
                            onUpdateItem(savedItem.id, "scored", sc);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                  {mode ? (
                    <ReasonRow
                      colSpan={5}
                      mode={mode}
                      tfcr={item.gapReason}
                      reason={item.reasonNotDone}
                      onChangeTfcr={(val) =>
                        onUpdateItem(savedItem.id, "gapReason", val)
                      }
                      onChangeReason={(val) =>
                        onUpdateItem(savedItem.id, "reasonNotDone", val)
                      }
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PlannerCard>
  );
};

// Review the "To Stop" items planned this week: score how much each was
// stopped / reduced (% done), with the same TFCR + reason row when it's under
// 100%. Mirrors the Top Goals / Other Things review tables.
const ToStopReviewTable = ({ savedItems, draftItems, onUpdateItem }) => {
  const liveProgress = useMemo(() => {
    const m = {};
    savedItems.forEach((it) => {
      const d = findById(draftItems, it.id) || it;
      m[it.id] = { p: d.progress || 0, s: effScored(d) };
    });
    return m;
  }, [savedItems, draftItems]);
  const settledProgress = useDebouncedValue(JSON.stringify(liveProgress));
  const settled = useMemo(() => JSON.parse(settledProgress), [settledProgress]);

  if (!savedItems || savedItems.length === 0) {
    return (
      <PlannerCard title="To Stop">
        <p className="text-xs text-black">
          No saved To Stop items yet. Add them under the To Stop tab and Save to
          score them here.
        </p>
      </PlannerCard>
    );
  }

  return (
    <PlannerCard
      title="To Stop"
      description="How Much Did You Actually Stop or Reduce Each One?"
      className="overflow-hidden p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
            <tr className="border-b border-black">
              <th className="px-3 py-2">S. No.</th>
              <th className="px-3 py-2">
                <span className="ml-10 inline-block">What I Will Stop / Reduce</span>
              </th>
              <th className="px-3 py-2">Weekly Time</th>
              <th className="px-3 py-2 text-right">% Stopped</th>
            </tr>
          </thead>
          <tbody>
            {savedItems.map((savedItem, idx) => {
              const item = findById(draftItems, savedItem.id) || savedItem;
              const label = savedItem.detail?.trim() ? savedItem.detail : "(empty)";
              const itemPS = settled[savedItem.id] || {
                p: item.progress || 0,
                s: effScored(item),
              };
              const mode = reasonMode(itemPS.s, itemPS.p, 0, 0);
              return (
                <Fragment key={savedItem.id}>
                  <tr className="border-b border-black align-middle hover:bg-white">
                    <td className="px-3 py-2 text-xs text-black">{idx + 1}</td>
                    <td className="px-3 py-2 text-sm text-black">{label}</td>
                    <td className="px-3 py-2 text-xs text-black">
                      {savedItem.weeklyTime || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex">
                        <PercentageField
                          value={item.progress}
                          scored={effScored(item)}
                          onChange={(val, sc) => {
                            onUpdateItem(savedItem.id, "progress", val);
                            onUpdateItem(savedItem.id, "scored", sc);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                  {mode ? (
                    <ReasonRow
                      colSpan={4}
                      mode={mode}
                      tfcr={item.gapReason}
                      reason={item.reasonNotDone}
                      onChangeTfcr={(val) =>
                        onUpdateItem(savedItem.id, "gapReason", val)
                      }
                      onChangeReason={(val) =>
                        onUpdateItem(savedItem.id, "reasonNotDone", val)
                      }
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </PlannerCard>
  );
};

const LearningsContent = ({
  lastWeekInsights,
  watchoutReasons,
  onUpdateInsights,
  onAddWatchout,
  onUpdateWatchout,
  onRemoveWatchout,
}) => {
  return (
    <div className="space-y-4">
      <PlannerCard title='A. Tangible Results I had committed to producing last week'>
        <textarea
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder="List the tangible results you committed to last week."
          value={lastWeekInsights.aResults || ""}
          onChange={(e) => onUpdateInsights("aResults", e.target.value)}
        />
        <label className="mb-1 mt-3 block text-xs font-semibold uppercase text-black">
          What&apos;s My Learning?
        </label>
        <textarea
          rows={3}
          className={`${inputClass} resize-y`}
          value={lastWeekInsights.aLearning || ""}
          onChange={(e) => onUpdateInsights("aLearning", e.target.value)}
        />
      </PlannerCard>

      <PlannerCard title='D. Things that are Unproductive or "Not Worth My Time" and I was to Stop Doing or Reduce Time'>
        <textarea
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder="List unproductive things you committed to stop or reduce."
          value={lastWeekInsights.dUnproductive || ""}
          onChange={(e) => onUpdateInsights("dUnproductive", e.target.value)}
        />
        <label className="mb-1 mt-3 block text-xs font-semibold uppercase text-black">
          What&apos;s My Learning?
        </label>
        <textarea
          rows={3}
          className={`${inputClass} resize-y`}
          value={lastWeekInsights.dLearning || ""}
          onChange={(e) => onUpdateInsights("dLearning", e.target.value)}
        />
      </PlannerCard>

      <PlannerCard title="E. Reasons that I kept entertaining that did not allow me to hit my Goals last week">
        <textarea
          rows={4}
          className={`${inputClass} resize-y`}
          placeholder="List the recurring distractions / excuses that pulled you off track."
          value={lastWeekInsights.eReasons || ""}
          onChange={(e) => onUpdateInsights("eReasons", e.target.value)}
        />
        <label className="mb-1 mt-3 block text-xs font-semibold uppercase text-black">
          What&apos;s My Learning?
        </label>
        <textarea
          rows={3}
          className={`${inputClass} resize-y`}
          value={lastWeekInsights.eLearning || ""}
          onChange={(e) => onUpdateInsights("eLearning", e.target.value)}
        />
      </PlannerCard>

      <PlannerCard title="E. Reasons that I need to watch out for in this week that will come up for me to hit my Goals for the week">
        <button
          type="button"
          onClick={onAddWatchout}
          className="inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-black hover:border-black"
        >
          + Add Row
        </button>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-[11px] font-semibold uppercase tracking-wide text-black">
              <tr>
                <th className="px-2 py-2">S. No</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Power Word</th>
                <th className="px-2 py-2">Defeated</th>
                <th className="px-2 py-2 text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              {watchoutReasons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-3 text-xs italic text-black">
                    No rows yet. Click + Add Row to start.
                  </td>
                </tr>
              ) : null}
              {watchoutReasons.map((row, index) => (
                <tr key={row.id} className="border-t border-black">
                  <td className="px-2 py-2 text-xs">{index + 1}</td>
                  <td className="px-2 py-2">
                    <input
                      className={inputClass}
                      value={row.reason}
                      onChange={(e) => onUpdateWatchout(row.id, "reason", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className={inputClass}
                      value={row.powerWord}
                      onChange={(e) => onUpdateWatchout(row.id, "powerWord", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <YesNoToggle
                      value={row.defeated}
                      onChange={(val) => onUpdateWatchout(row.id, "defeated", val)}
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onRemoveWatchout(row.id)}
                      title="Delete row"
                      className="inline-flex items-center justify-center rounded-md border border-black p-1.5 text-black transition hover:bg-red-600 hover:border-red-600 hover:text-white"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlannerCard>
    </div>
  );
};

const LearningsReviewCard = ({ savedStopDoingNow, draftStopDoingNow, onUpdateRow }) => {
  if (!savedStopDoingNow || savedStopDoingNow.length === 0) {
    return (
      <PlannerCard
        title="Learnings"
        description="Rate the Things You Committed to Stop or Reduce."
      >
        <p className="text-xs text-black">No saved Learnings rows yet.</p>
      </PlannerCard>
    );
  }
  return (
    <PlannerCard
      title="Learnings"
      description="Did You Actually Stop / Reduce Each of These?"
    >
      <div className="space-y-2">
        {savedStopDoingNow.map((saved, idx) => {
          const row = findById(draftStopDoingNow, saved.id) || saved;
          return (
            <div
              key={saved.id}
              className="rounded-lg border border-black bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-black">
                    {idx + 1}. {saved.detail?.trim() ? saved.detail : "(empty)"}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-black">
                    Weekly time: {saved.weeklyTime || "—"}
                  </p>
                </div>
                <YesNoToggle
                  value={row.done}
                  onChange={(val) => onUpdateRow(saved.id, "done", val)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </PlannerCard>
  );
};

const CarryForwardTopGoalsCard = ({
  topGoals,
  selectedSubIds,
  tag,
  choice,
  onToggleSub,
  onUpdateTag,
  onUpdateChoice,
}) => {
  if (!topGoals || topGoals.length === 0) return null;
  const totalSelected = selectedSubIds.length;

  return (
    <PlannerCard
      title="Unfinished Tasks"
      description="Goals Under 100%. Pick the Ones to Carry Into Next Week."
    >
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black">
            Incomplete Goals
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black">
            % Completed
          </span>
        </div>
        <ul className="space-y-2">
          {topGoals.map((goal) => {
            const checked = selectedSubIds.includes(goal.id);
            return (
              <li key={goal.id}>
                <label
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition cursor-pointer ${
                    checked
                      ? "border-red-600 bg-red-50"
                      : "border-black bg-white hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-red-600"
                    checked={checked}
                    onChange={() => onToggleSub(goal.id)}
                  />
                  <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-black px-2 py-0.5 text-[11px] font-bold text-white">
                    {goal.letter}
                  </span>
                  <span className="flex-1 font-semibold text-black">{goal.label}</span>
                  <span className="shrink-0 rounded-md border border-black bg-white px-2.5 py-1 text-xs font-bold text-black">
                    {formatProgress(goal.progress)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-zinc-200 pt-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-black">
            Carry-forward tag
          </label>
          <input
            className={`${inputClass} placeholder:text-black placeholder:font-normal`}
            value={tag}
            placeholder="e.g. Carry Forwarded"
            onChange={(e) => onUpdateTag(e.target.value)}
          />
        </div>

        {totalSelected > 0 ? (
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase text-black">
              Carry {totalSelected} selected to next week?
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 text-sm font-medium text-black">
                <input
                  type="radio"
                  name="carry-forward-choice"
                  className="h-4 w-4 accent-red-600"
                  checked={choice === "yes"}
                  onChange={() => onUpdateChoice("yes")}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-1.5 text-sm font-medium text-black">
                <input
                  type="radio"
                  name="carry-forward-choice"
                  className="h-4 w-4 accent-red-600"
                  checked={choice === "no"}
                  onChange={() => onUpdateChoice("no")}
                />
                No
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </PlannerCard>
  );
};

const CarryForwardOtherThingsCard = ({
  otherItems,
  selectedOtherIds,
  tag,
  choice,
  onToggleOther,
  onUpdateTag,
  onUpdateChoice,
}) => {
  if (otherItems.length === 0) return null;
  const totalSelected = selectedOtherIds.length;

  return (
    <PlannerCard
      title="Unfinished Tasks"
      description="Other Things Under 100%. Pick the Ones to Carry Into Next Week."
    >
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black">
            Incomplete Items
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-black">
            % Completed
          </span>
        </div>
        <ul className="space-y-2">
          {otherItems.map((item) => {
            const checked = selectedOtherIds.includes(item.id);
            return (
              <li key={item.id}>
                <label
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition cursor-pointer ${
                    checked
                      ? "border-red-600 bg-red-50"
                      : "border-black bg-white hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-red-600"
                    checked={checked}
                    onChange={() => onToggleOther(item.id)}
                  />
                  <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-black px-2 py-0.5 text-[11px] font-bold text-white">
                    {item.itemLetter}
                  </span>
                  <span className="flex-1 font-semibold text-black">{item.label}</span>
                  <span className="shrink-0 rounded-md border border-black bg-white px-2.5 py-1 text-xs font-bold text-black">
                    {formatProgress(item.progress)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-zinc-200 pt-5">
          <label className="mb-1.5 block text-xs font-semibold uppercase text-black">
            Carry-forward tag
          </label>
          <input
            className={`${inputClass} placeholder:text-black placeholder:font-normal`}
            value={tag}
            placeholder="e.g. Carry Forwarded"
            onChange={(e) => onUpdateTag(e.target.value)}
          />
        </div>

        {totalSelected > 0 ? (
          <div className="mt-5">
            <label className="mb-2 block text-xs font-semibold uppercase text-black">
              Carry {totalSelected} selected to next week?
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 text-sm font-medium text-black">
                <input
                  type="radio"
                  name="carry-forward-choice-other"
                  className="h-4 w-4 accent-red-600"
                  checked={choice === "yes"}
                  onChange={() => onUpdateChoice("yes")}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-1.5 text-sm font-medium text-black">
                <input
                  type="radio"
                  name="carry-forward-choice-other"
                  className="h-4 w-4 accent-red-600"
                  checked={choice === "no"}
                  onChange={() => onUpdateChoice("no")}
                />
                No
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </PlannerCard>
  );
};

const computeOverallProgress = (subs, others) => {
  let sum = 0;
  let weight = 0;
  [...subs, ...others].forEach((row) => {
    const hours = parseDurationToHours(row.duration);
    const w = hours > 0 ? hours : 1;
    const p = Math.max(0, Math.min(1, Number(row.progress) || 0));
    sum += p * w;
    weight += w;
  });
  if (weight === 0) return 0;
  return sum / weight;
};

const TOGGLE_OPTIONS = [
  { id: "topGoals", label: "Top Goals" },
  { id: "otherThings", label: "Other Things" },
  { id: "toStop", label: "To Stop" },
];

const ReviewWorkspace = ({
  weekLabel,
  // saved (committed) data — what tasks exist
  savedCommitments = [],
  savedActions = [],
  savedOtherCommitments = [],
  savedStopDoingNow = [],
  // draft data — current in-progress edits (score, reason, actual time)
  draftCommitments = [],
  draftActions = [],
  draftOtherCommitments = [],
  draftStopDoingNow = [],
  // Learnings tab content
  lastWeekInsights = {},
  watchoutReasons = [],
  onUpdateInsights,
  onAddWatchout,
  onUpdateWatchout,
  onRemoveWatchout,
  carryForwardOptions,
  carrySelectedSubIds,
  carrySelectedOtherIds,
  carryForwardTag,
  carryForwardChoice,
  onUpdateCommitment,
  onUpdateAction,
  onUpdateOtherCommitment,
  onUpdateStopDoingRow,
  onToggleCarrySub,
  onToggleCarryOther,
  onUpdateCarryForwardTag,
  onUpdateCarryForwardChoice,
  onSave,
}) => {
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reviewTab, setReviewTab] = useState("topGoals");

  // Overall % = average of the RESULT %s the user typed for goals + other things
  // (SAVED values), so it changes only after Save, not while typing.
  const overall = useMemo(() => {
    const rows = [...savedCommitments, ...savedOtherCommitments];
    if (rows.length === 0) return 0;
    const sum = rows.reduce(
      (s, r) => s + Math.max(0, Math.min(1, Number(r.progress) || 0)),
      0
    );
    return sum / rows.length;
  }, [savedCommitments, savedOtherCommitments]);

  const overallPct = Math.round(overall * 100);
  const hasAnything = savedCommitments.length + savedOtherCommitments.length > 0;

  // Today's date + how many tasks fall this week / today, and how many are
  // still unscored (live draft %), so the user knows what's left to review.
  const stats = useMemo(() => {
    const today = todayISO();
    const tasks = [...savedActions, ...savedOtherCommitments];
    const liveById = {};
    [...draftActions, ...draftOtherCommitments].forEach((r) => {
      liveById[r.id] = r;
    });
    const dateOf = (r) => (r.executionDate || r.targetDate || "").trim();
    const todayCount = tasks.filter((t) => dateOf(t) === today).length;
    const unscored = tasks.filter(
      (t) => ((liveById[t.id] || t).progress || 0) === 0
    ).length;
    return { today, weekCount: tasks.length, todayCount, unscored };
  }, [savedActions, savedOtherCommitments, draftActions, draftOtherCommitments]);

  const handleSave = () => {
    const result = onSave?.();
    if (result?.invalid) {
      // TFCR is mandatory for every task whose Reasons block is open — block
      // the save until each has at least one category + subcategory picked.
      setSaveMessage("");
      setSaveError(
        "Can't save — every task scored under 100% needs its TFCR: pick at least one of T/F/C/R and a subcategory for each. (Writing the reason is optional.)"
      );
      return;
    }
    setSaveError("");
    if (result?.forwarded) {
      setSaveMessage("Saved. Carried forward to next week.");
    } else {
      setSaveMessage("Saved successfully.");
    }
    window.setTimeout(() => setSaveMessage(""), 2800);
  };

  return (
    <div className="space-y-4">
      <PlannerCard
        title={`Rate Your % Done${weekLabel ? ` · ${weekLabel}` : ""}`}
        description={
          hasAnything
            ? `You're Currently at ${overallPct}% Complete. Rate Each Item Below, Then Save.`
            : "Nothing Saved Yet. Add Tasks Under Top Goals or Other Things and Click Save There First."
        }
        className="border-2 border-red-600 bg-white"
      >
        {hasAnything ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-black bg-black px-3 py-1.5 text-xs font-semibold text-white">
              Today · {formatLongDate(stats.today)}
            </span>
          </div>
        ) : null}
      </PlannerCard>

      <div className="mt-6 inline-flex rounded-xl border border-black bg-white p-1">
        {TOGGLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setReviewTab(opt.id)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150",
              reviewTab === opt.id
                ? "bg-red-600 text-white"
                : "bg-white text-black hover:bg-black hover:text-white"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {reviewTab === "topGoals" ? (
        <>
          <TopGoalsTable
            savedCommitments={savedCommitments}
            savedActions={savedActions}
            draftCommitments={draftCommitments}
            draftActions={draftActions}
            onUpdateCommitment={onUpdateCommitment}
            onUpdateAction={onUpdateAction}
          />
          <CarryForwardTopGoalsCard
            topGoals={carryForwardOptions?.topGoals || []}
            selectedSubIds={carrySelectedSubIds}
            tag={carryForwardTag}
            choice={carryForwardChoice}
            onToggleSub={onToggleCarrySub}
            onUpdateTag={onUpdateCarryForwardTag}
            onUpdateChoice={onUpdateCarryForwardChoice}
          />
        </>
      ) : reviewTab === "otherThings" ? (
        <>
          <OtherThingsReviewTable
            savedItems={savedOtherCommitments}
            draftItems={draftOtherCommitments}
            onUpdateItem={onUpdateOtherCommitment}
          />
          <CarryForwardOtherThingsCard
            otherItems={carryForwardOptions?.otherItems || []}
            selectedOtherIds={carrySelectedOtherIds}
            tag={carryForwardTag}
            choice={carryForwardChoice}
            onToggleOther={onToggleCarryOther}
            onUpdateTag={onUpdateCarryForwardTag}
            onUpdateChoice={onUpdateCarryForwardChoice}
          />
        </>
      ) : (
        <ToStopReviewTable
          savedItems={savedStopDoingNow}
          draftItems={draftStopDoingNow}
          onUpdateItem={onUpdateStopDoingRow}
        />
      )}

      <div className="flex items-center justify-end gap-3">
        {saveError ? (
          <p className="max-w-md text-right text-xs font-semibold text-red-600">
            {saveError}
          </p>
        ) : saveMessage ? (
          <p className="text-xs font-medium text-black">{saveMessage}</p>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 hover:border-red-600"
        >
          Save Weekly Review
        </button>
      </div>
    </div>
  );
};

export default ReviewWorkspace;
