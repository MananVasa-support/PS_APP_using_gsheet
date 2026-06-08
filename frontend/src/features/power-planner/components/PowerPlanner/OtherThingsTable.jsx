import { useState } from "react";
import { FiAlertCircle, FiPlus } from "react-icons/fi";
import {
  ASSIGNEE_OPTIONS,
  CATEGORY_OPTIONS,
  PURPOSE_OPTIONS,
} from "../../data/powerPlannerConstants";
import { addDurationToStartTime } from "../../utils/powerPlannerUtils";
import { clampToRange, todayISO } from "../../utils/weekDates";
import AutoGrowTextarea from "./fields/AutoGrowTextarea";
import ColorField from "./fields/ColorField";
import DurationField from "./fields/DurationField";
import FrequencyField from "./fields/FrequencyField";
import LockedOverlay from "./fields/LockedOverlay";
import RowControls from "./fields/RowControls";
import TagSelectField from "./fields/TagSelectField";
import PlannerCard from "./PlannerCard";

const ConflictMark = ({ show }) =>
  show ? (
    <FiAlertCircle
      className="ml-1 inline text-red-600"
      title="Same person, same time — conflict"
    />
  ) : null;

const OtherThingsTable = ({
  items,
  itemIds,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onSave,
  isEditing = true,
  onEdit,
  onCancel,
  onExportToCalendar,
  conflictIds = new Set(),
  conflictBlocksSave = true,
  // The selected week's bounds — item target dates must fall inside it.
  weekStart = "",
  weekEnd = "",
  // Dropdown option lists (base + user-remembered "Other" names).
  categoryOptions = CATEGORY_OPTIONS,
  purposeOptions = PURPOSE_OPTIONS,
  assigneeOptions = ASSIGNEE_OPTIONS,
  removableCategories = [],
  removablePurposes = [],
  removableDelegates = [],
  onRemoveOption,
}) => {
  const today = todayISO();
  const minDate = weekStart && weekStart > today ? weekStart : today;
  const maxDate = weekEnd || undefined;
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  // Red field highlights only switch on after a blocked save.
  const [showErrors, setShowErrors] = useState(false);

  // Required-field validation. Every item needs a name, target date, duration,
  // start time and delegate. Frequency is optional; auto-created "Repeat" rows
  // are skipped.
  const missingByRow = {};
  const markMissing = (id, field) => {
    if (!missingByRow[id]) missingByRow[id] = new Set();
    missingByRow[id].add(field);
  };
  items.forEach((it) => {
    if (it.isRepeat) return;
    if (!it.result?.trim()) markMissing(it.id, "name");
    if (!it.targetDate) markMissing(it.id, "date");
    if (!it.duration) markMissing(it.id, "duration");
    if (!it.startTime) markMissing(it.id, "time");
    const assigned = (it.assignedTo || "").trim();
    if (!assigned) markMissing(it.id, "delegate");
    else if (assigned === "Other" && !it.customDoneBy?.trim())
      markMissing(it.id, "delegate");
  });
  const incompleteCount = Object.keys(missingByRow).length;
  const hasMissing = incompleteCount > 0;
  // Block export while anything is broken (missing fields or a time clash).
  const exportBlocked = hasMissing || (conflictIds && conflictIds.size > 0);
  const isMissing = (id, field) => showErrors && missingByRow[id]?.has(field);
  const MISSING_LABELS = {
    name: "name",
    date: "date",
    duration: "duration",
    time: "start time",
    delegate: "delegate",
  };
  const rowMissingText = (id) => {
    const set = missingByRow[id];
    if (!set) return "";
    return ["name", "date", "duration", "time", "delegate"]
      .filter((k) => set.has(k))
      .map((k) => MISSING_LABELS[k])
      .join(", ");
  };

  // Category and Purpose are independent per item here (no parent to inherit
  // from). "Other" stores free text. Same shape the shared field expects.
  const tagHandlers = (item, base, custom) => ({
    value: item[base] || "",
    customValue: item[custom] || "",
    onChange: (val) => {
      onUpdateItem(item.id, base, val);
      if (val !== "Other") onUpdateItem(item.id, custom, "");
    },
    onChangeCustom: (text) => {
      if (item[base] !== "Other") onUpdateItem(item.id, base, "Other");
      onUpdateItem(item.id, custom, text);
    },
    onClear: () => {
      onUpdateItem(item.id, base, "");
      onUpdateItem(item.id, custom, "");
    },
  });

  const handleFieldUpdate = (item, field, value) => {
    onUpdateItem(item.id, field, value);
    if (field === "startTime" || field === "duration") {
      const computedEndTime = addDurationToStartTime(
        field === "startTime" ? value : item.startTime,
        field === "duration" ? value : item.duration
      );
      onUpdateItem(item.id, "endTime", computedEndTime);
    }
  };

  const handleSaveClick = () => {
    if (hasMissing) {
      setShowErrors(true);
      setSaveError(
        `${incompleteCount} incomplete ${
          incompleteCount === 1 ? "item" : "items"
        }: fill the highlighted fields or delete the row. Every item needs a name, date, duration, start time and delegate (frequency is optional).`
      );
      setSaveMessage("");
      return;
    }
    if (conflictBlocksSave && conflictIds && conflictIds.size > 0) {
      setSaveError(
        "Schedule conflict: the same person is double-booked at the same time. Fix the highlighted rows before saving."
      );
      setSaveMessage("");
      return;
    }
    setSaveError("");
    setShowErrors(false);
    const result = onSave?.();
    // A "this one vs all" dialog is finishing the save — don't flash "Saved" yet.
    if (result && result.deferred) return;
    setSaveMessage("Saved. Insights updated.");
    window.setTimeout(() => setSaveMessage(""), 2500);
  };

  return (
    <PlannerCard
      title="Other Things"
      description="Other Things to Get Done This Week."
      className="overflow-hidden p-0"
    >
      {!isEditing ? (
        <div className="flex flex-wrap items-center justify-end gap-3 border-b border-black px-5 py-3">
          <p className="mr-auto text-xs font-medium text-black">
            Saved — click Edit to make changes.
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 hover:border-red-600"
          >
            Edit
          </button>
        </div>
      ) : null}
      <div className="relative">
      <fieldset disabled={!isEditing} className="contents">
      <div className="flex flex-wrap items-center gap-3 border-b border-black px-5 py-4">
        <button
          type="button"
          onClick={() => onAddItem()}
          className="inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiPlus />
          Add Item
        </button>
      </div>

      <div className="overflow-x-auto">
        {/* Content-width wrapper so the lock overlay covers the full table while
            still sitting inside the scroller — keeps horizontal scroll working
            while the section is locked. */}
        <div className="relative w-max min-w-full">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-[11px] font-semibold uppercase tracking-wide text-black backdrop-blur">
            <tr className="border-b border-black">
              <th className="px-2 py-2.5 min-w-[50px]">Ref</th>
              <th className="px-2 py-2.5">Controls</th>
              <th className="px-2 py-2.5 min-w-[132px]">Category</th>
              <th className="px-2 py-2.5 min-w-[132px]">Purpose</th>
              <th className="px-2 py-2.5 min-w-[200px]">Other Thing</th>
              <th className="px-2 py-2.5 min-w-[122px]">Target Date</th>
              <th className="px-2 py-2.5 min-w-[108px]">Duration</th>
              <th className="px-2 py-2.5 min-w-[108px]">From</th>
              <th className="px-2 py-2.5 min-w-[108px]">To</th>
              <th className="px-2 py-2.5 min-w-[108px]">Delegate To</th>
              <th className="px-2 py-2.5 min-w-[148px]">Frequency</th>
              <th className="px-2 py-2.5 min-w-[150px]">Colour Coding</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const id = itemIds[index];
              const hasConflict = conflictIds.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`border-b border-black align-top ${
                    hasConflict ? "bg-red-50" : "bg-white"
                  }`}
                >
                  <td className="px-2 py-2">
                    <span className="inline-flex rounded-md bg-black px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {id}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <RowControls
                      compact
                      onMoveUp={() => onMoveItem(index, index - 1)}
                      onMoveDown={() => onMoveItem(index, index + 1)}
                      onDelete={() => onDeleteItem(item.id)}
                      canMoveUp={index > 0}
                      canMoveDown={index < items.length - 1}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <TagSelectField
                      options={categoryOptions}
                      removable={removableCategories}
                      onRemove={(n) => onRemoveOption?.("category", n)}
                      placeholder="Select"
                      customPlaceholder="Type category"
                      {...tagHandlers(item, "category", "customCategory")}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <TagSelectField
                      options={purposeOptions}
                      removable={removablePurposes}
                      onRemove={(n) => onRemoveOption?.("purpose", n)}
                      placeholder="Select"
                      customPlaceholder="Type purpose"
                      {...tagHandlers(item, "purpose", "customPurpose")}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <AutoGrowTextarea
                      value={item.result}
                      onChange={(e) => onUpdateItem(item.id, "result", e.target.value)}
                      placeholder="Other Goals e.g. Cooking"
                      className={`w-full rounded-lg border bg-white px-2.5 py-2 text-[15px] font-semibold leading-snug outline-none focus:border-red-600 ${
                        isMissing(item.id, "name") ? "border-red-600" : "border-black"
                      }`}
                    />
                    {showErrors && missingByRow[item.id] ? (
                      <p className="mt-1 text-[10px] font-semibold text-red-600">
                        ⚠ Missing: {rowMissingText(item.id)} — fill it or delete this item.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={item.targetDate}
                      min={minDate}
                      max={maxDate}
                      title="Must fall within this week"
                      onChange={(e) =>
                        onUpdateItem(
                          item.id,
                          "targetDate",
                          clampToRange(e.target.value, minDate, maxDate)
                        )
                      }
                      className={`w-full rounded-lg border bg-white px-1.5 py-1.5 text-xs ${
                        isMissing(item.id, "date") ? "border-red-600" : "border-black"
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <DurationField
                      value={item.duration}
                      onChange={(next) => handleFieldUpdate(item, "duration", next)}
                      className={
                        isMissing(item.id, "duration")
                          ? "rounded-lg p-0.5 ring-2 ring-red-600"
                          : ""
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center">
                      <input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => handleFieldUpdate(item, "startTime", e.target.value)}
                        className={`w-full rounded-lg border bg-white px-1.5 py-1.5 text-xs ${
                          hasConflict || isMissing(item.id, "time")
                            ? "border-red-600"
                            : "border-black"
                        }`}
                      />
                      <ConflictMark show={hasConflict} />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center">
                      <input
                        type="time"
                        readOnly
                        tabIndex={-1}
                        value={item.endTime}
                        title="Auto-calculated from Start Time + Duration"
                        className={`w-full cursor-not-allowed rounded-lg border bg-white px-1.5 py-1.5 text-xs text-black ${
                          hasConflict ? "border-red-600" : "border-black"
                        }`}
                      />
                      <ConflictMark show={hasConflict} />
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    {hasConflict ? (
                      <p className="mb-1 text-[10px] font-semibold text-red-600">
                        ⚠ same person, same time
                      </p>
                    ) : null}
                    <TagSelectField
                      options={assigneeOptions}
                      removable={removableDelegates}
                      onRemove={(n) => onRemoveOption?.("delegate", n)}
                      placeholder="Select"
                      customPlaceholder="Type Name"
                      missing={isMissing(item.id, "delegate")}
                      value={item.assignedTo}
                      customValue={item.customDoneBy}
                      onChange={(val) => {
                        onUpdateItem(item.id, "assignedTo", val);
                        if (val !== "Other" && item.customDoneBy)
                          onUpdateItem(item.id, "customDoneBy", "");
                      }}
                      onChangeCustom={(text) => {
                        if (item.assignedTo !== "Other")
                          onUpdateItem(item.id, "assignedTo", "Other");
                        onUpdateItem(item.id, "customDoneBy", text);
                      }}
                      onClear={() => {
                        onUpdateItem(item.id, "assignedTo", "Self");
                        onUpdateItem(item.id, "customDoneBy", "");
                      }}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <FrequencyField
                      isRepeat={item.isRepeat}
                      seriesLabel={item.seriesLabel}
                      frequency={item.frequency}
                      recurEnd={item.recurEnd}
                      recurCustom={item.recurCustom}
                      targetDate={item.targetDate}
                      onChange={(field, value) =>
                        onUpdateItem(item.id, field, value)
                      }
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <ColorField
                      value={item.colorKey}
                      onChange={(k) => onUpdateItem(item.id, "colorKey", k)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <LockedOverlay active={!isEditing} />
        </div>
      </div>
      </fieldset>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-black px-5 py-4">
        {saveError ? (
          <p className="text-xs font-medium text-red-600">{saveError}</p>
        ) : saveMessage ? (
          <p className="text-xs font-medium text-black">{saveMessage}</p>
        ) : !isEditing && exportBlocked ? (
          <p className="text-xs font-medium text-red-600">
            Some items have missing fields or a time clash — click Edit and fix them before exporting.
          </p>
        ) : !isEditing ? (
          <p className="text-xs font-medium text-black">Saved — click Edit to make changes.</p>
        ) : null}
        {isEditing ? (
          <>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-black bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-black hover:text-white"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSaveClick}
              className="rounded-xl border border-red-600 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black hover:border-black"
            >
              Save Other Things
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 hover:border-red-600"
            >
              Edit
            </button>
            {onExportToCalendar ? (
              <button
                type="button"
                onClick={onExportToCalendar}
                disabled={exportBlocked}
                title={
                  exportBlocked
                    ? "Fix missing fields or time clashes first"
                    : "Open each Self item as a Google Calendar event"
                }
                className={`rounded-xl border border-red-600 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black hover:border-black ${
                  exportBlocked ? "cursor-not-allowed opacity-40 hover:bg-red-600 hover:border-red-600" : ""
                }`}
              >
                Export to Calendar
              </button>
            ) : null}
          </>
        )}
      </div>
    </PlannerCard>
  );
};

export default OtherThingsTable;
