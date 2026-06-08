import { Fragment, useState } from "react";
import { FiAlertCircle, FiPlus } from "react-icons/fi";
import {
  ASSIGNEE_OPTIONS,
  CATEGORY_OPTIONS,
  PURPOSE_OPTIONS,
} from "../../data/powerPlannerConstants";
import { addDurationToStartTime } from "../../utils/powerPlannerUtils";
import { isRecurring } from "../../utils/recurrence";

// Results carry a single in-week deadline, so a same-week daily repeat makes no
// sense — they get the longer cadences only. Actions get the full set.
const RESULT_FREQS = ["once", "weekly", "monthly", "quarterly", "annually", "custom"];
const ACTION_FREQS = ["once", "daily", "weekday", "weekly", "monthly", "annually", "custom"];
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

const UnifiedPlannerTable = ({
  commitments,
  commitmentIds,
  getActionsByParent,
  onAddCommitment,
  onUpdateCommitment,
  onDeleteCommitment,
  onMoveCommitment,
  onToggleCommitmentCollapse,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onMoveAction,
  onToggleActionCollapse,
  onSave,
  isEditing = true,
  onEdit,
  onCancel,
  onExportToCalendar,
  title = "Top Goals",
  description = "Top goals and their actions in one structured sheet.",
  addCommitmentLabel = "Add Goal",
  saveLabel = "Save",
  saveSuccessMessage = "Saved. Insights updated.",
  resultPlaceholder = "Result I Am Committing to Produce This Week",
  actionPlaceholder = "Action I Am Committing to Take",
  conflictIds = new Set(),
  conflictBlocksSave = true,
  // The selected week's bounds — goal/action dates must fall inside it.
  weekStart = "",
  weekEnd = "",
  // Dropdown option lists (base + user-remembered "Other" names).
  categoryOptions = CATEGORY_OPTIONS,
  purposeOptions = PURPOSE_OPTIONS,
  assigneeOptions = ASSIGNEE_OPTIONS,
  // The user-added names (removable from the dropdowns) + remover.
  removableCategories = [],
  removablePurposes = [],
  removableDelegates = [],
  onRemoveOption,
}) => {
  // Earliest selectable date: the week's start, but never before today (so the
  // current week can't be back-dated). Latest: the week's last day.
  const today = todayISO();
  const minDate = weekStart && weekStart > today ? weekStart : today;
  const maxDate = weekEnd || undefined;

  const handleActionFieldUpdate = (action, field, value) => {
    onUpdateAction(action.id, field, value);

    if (field === "startTime" || field === "duration") {
      const computedEndTime = addDurationToStartTime(
        field === "startTime" ? value : action.startTime,
        field === "duration" ? value : action.duration
      );
      onUpdateAction(action.id, "endTime", computedEndTime);
    }
  };

  // A sub-action with no category of its own inherits (displays) its parent
  // goal's category — but the dropdown stays live so the user can override it.
  // Purpose never cascades; each row picks its own. Writing a custom value on an
  // inherited row first promotes the row to its own explicit "Other".
  const catHandlers = (row, parent) => ({
    value: row.category || parent?.category || "",
    ownValue: row.category || "",
    customValue: row.category ? row.customCategory : parent?.customCategory || "",
    onChange: (val) => {
      onUpdateCommitmentLike(row, "category", val);
      if (val !== "Other") onUpdateCommitmentLike(row, "customCategory", "");
    },
    onChangeCustom: (text) => {
      if (!row.category) onUpdateCommitmentLike(row, "category", "Other");
      onUpdateCommitmentLike(row, "customCategory", text);
    },
    onClear: () => {
      onUpdateCommitmentLike(row, "category", "");
      onUpdateCommitmentLike(row, "customCategory", "");
    },
  });
  // Purpose cascades from the parent goal to its actions the same way Category
  // does: an action with no Purpose of its own shows (defaults to) the goal's,
  // but the dropdown stays live so it can be overridden. Goal rows pass no
  // parent, so they behave independently.
  const purposeHandlers = (row, parent) => ({
    value: row.purpose || parent?.purpose || "",
    ownValue: row.purpose || "",
    customValue: row.purpose ? row.customPurpose : parent?.customPurpose || "",
    onChange: (val) => {
      onUpdateCommitmentLike(row, "purpose", val);
      if (val !== "Other") onUpdateCommitmentLike(row, "customPurpose", "");
    },
    onChangeCustom: (text) => {
      if (!row.purpose) onUpdateCommitmentLike(row, "purpose", "Other");
      onUpdateCommitmentLike(row, "customPurpose", text);
    },
    onClear: () => {
      onUpdateCommitmentLike(row, "purpose", "");
      onUpdateCommitmentLike(row, "customPurpose", "");
    },
  });
  // Route an update to the right list (goal row vs sub-action row).
  const onUpdateCommitmentLike = (row, field, value) =>
    row.parentCommitmentId !== undefined
      ? onUpdateAction(row.id, field, value)
      : onUpdateCommitment(row.id, field, value);

  // "Repeat with goal" on/off for a sub-action. Turning it ON clears any own
  // schedule the sub-action had (the two are mutually exclusive).
  const toggleRideWithGoal = (commitment, action) => {
    const current = commitment.recurSubIds || [];
    const isOn = current.includes(action.id);
    onUpdateCommitment(
      commitment.id,
      "recurSubIds",
      isOn ? current.filter((id) => id !== action.id) : [...current, action.id]
    );
    if (!isOn) {
      onUpdateAction(action.id, "frequency", "once");
      onUpdateAction(action.id, "recurDays", []);
    }
  };

  // A sub-action's OWN frequency change. Choosing a recurring schedule removes it
  // from the goal's ride-along list (mutually exclusive).
  const handleSubFreqChange = (action, commitment, field, value) => {
    onUpdateAction(action.id, field, value);
    if (field === "frequency" && isRecurring(value)) {
      const current = commitment.recurSubIds || [];
      if (current.includes(action.id)) {
        onUpdateCommitment(
          commitment.id,
          "recurSubIds",
          current.filter((id) => id !== action.id)
        );
      }
    }
  };

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  // Red field highlights only switch on after a blocked save, so the user isn't
  // bombarded with red while still filling a fresh row in.
  const [showErrors, setShowErrors] = useState(false);

  // Sub-actions whose target date is later than their parent's target date
  const invalidDateIds = new Set();
  commitments.forEach((c) => {
    if (!c.targetDate) return;
    getActionsByParent(c.id).forEach((sub) => {
      if (sub.executionDate && sub.executionDate > c.targetDate) {
        invalidDateIds.add(sub.id);
      }
    });
  });

  // Required-field validation. Every goal needs a name + target date; every
  // sub-action also needs a duration, start time and delegate. Frequency is
  // optional, and auto-created "Repeat" rows are skipped. We record, per row,
  // which fields are still blank so we can both highlight them and block save.
  const missingByRow = {};
  const markMissing = (id, field) => {
    if (!missingByRow[id]) missingByRow[id] = new Set();
    missingByRow[id].add(field);
  };
  commitments.forEach((c) => {
    if (c.isRepeat || c.isPlaceholder) return;
    if (!c.result?.trim()) markMissing(c.id, "name");
    if (!c.targetDate) markMissing(c.id, "date");
    getActionsByParent(c.id).forEach((sub) => {
      if (sub.isRepeat) return;
      if (!sub.description?.trim()) markMissing(sub.id, "name");
      if (!sub.executionDate) markMissing(sub.id, "date");
      if (!sub.duration) markMissing(sub.id, "duration");
      if (!sub.startTime) markMissing(sub.id, "time");
      const assigned = (sub.assignedTo || "").trim();
      if (!assigned) markMissing(sub.id, "delegate");
      else if (assigned === "Other" && !sub.customDoneBy?.trim())
        markMissing(sub.id, "delegate");
    });
  });
  const incompleteCount = Object.keys(missingByRow).length;
  const hasMissing = incompleteCount > 0;
  // Export (and a clean save) is only allowed when nothing is broken: no missing
  // required fields, no out-of-range dates, and no same-person/same-time clashes
  // (e.g. two Self actions overlapping). Stops exporting bad data to Calendar.
  const exportBlocked =
    hasMissing ||
    invalidDateIds.size > 0 ||
    (conflictIds && conflictIds.size > 0);
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

  const handleSaveClick = () => {
    if (hasMissing) {
      setShowErrors(true);
      setSaveError(
        `${incompleteCount} incomplete ${
          incompleteCount === 1 ? "entry" : "entries"
        }: fill the highlighted fields or delete the row. Every goal needs a name and date; every action also needs a duration, start time and delegate (frequency is optional).`
      );
      setSaveMessage("");
      return;
    }
    if (invalidDateIds.size > 0) {
      setSaveError(
        "Some actions have a target date later than their goal's target date. Fix the highlighted rows before saving."
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
    setSaveMessage(saveSuccessMessage);
    window.setTimeout(() => setSaveMessage(""), 2500);
  };

  return (
    <PlannerCard
      title={title}
      description={description}
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
      {/* Not a disabled <fieldset>: locking is handled by LockedOverlay (which
          catches clicks and shows the "click Edit" toast). A disabled fieldset
          would also disable the collapse toggle, but we want that one control to
          stay usable while locked so the user can hide sub-tasks without editing. */}
      <fieldset className="contents">
      <div className="flex flex-wrap items-center gap-3 border-b border-black px-5 py-4">
        <button
          type="button"
          onClick={() => isEditing && onAddCommitment()}
          disabled={!isEditing}
          className={`inline-flex items-center gap-2 rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black hover:border-black ${
            !isEditing ? "cursor-not-allowed opacity-40" : ""
          }`}
        >
          <FiPlus />
          {addCommitmentLabel}
        </button>
      </div>

      <div className="overflow-x-auto">
        {/* Content-width wrapper so the lock overlay can cover the FULL table
            (every column) while still living INSIDE the scroll container — that
            way horizontal scroll/drag passes through to the scroller even while
            the section is locked. */}
        <div className="relative w-max min-w-full">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-[11px] font-semibold uppercase tracking-wide text-black backdrop-blur">
            <tr className="border-b border-black">
              <th className="px-2 py-2.5 min-w-[50px]">Ref</th>
              <th className="px-2 py-2.5">Controls</th>
              <th className="px-2 py-2.5 min-w-[132px]">Category</th>
              <th className="px-2 py-2.5 min-w-[132px]">Purpose</th>
              <th className="px-2 py-2.5 min-w-[200px]">Results / Actions</th>
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
            {commitments.map((commitment, index) => {
              const parentId = commitmentIds[index];
              const subActions = getActionsByParent(commitment.id);

              return (
                <Fragment key={commitment.id}>
                  <tr className="border-b border-black bg-white align-top">
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded-md bg-black px-2 py-0.5 text-[11px] font-bold text-white">
                        {parentId}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => onAddAction(commitment.id)}
                          className="inline-flex w-fit items-center gap-1 rounded-lg border border-red-600 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600 hover:text-white"
                        >
                          <FiPlus />
                          Add {`${parentId}${subActions.length + 1}`}
                        </button>
                        <RowControls
                          compact
                          onInsertBelow={() => onAddCommitment(index + 1)}
                          onMoveUp={() => onMoveCommitment(index, index - 1)}
                          onMoveDown={() => onMoveCommitment(index, index + 1)}
                          onDelete={() => onDeleteCommitment(commitment.id)}
                          onToggleCollapse={() => onToggleCommitmentCollapse(commitment.id)}
                          collapsed={commitment.collapsed}
                          liftCollapse={!isEditing}
                          canMoveUp={index > 0}
                          canMoveDown={index < commitments.length - 1}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <TagSelectField
                        options={categoryOptions}
                        removable={removableCategories}
                        onRemove={(n) => onRemoveOption?.("category", n)}
                        placeholder="Select"
                        customPlaceholder="Type category"
                        {...catHandlers(commitment, null)}
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <TagSelectField
                        options={purposeOptions}
                        removable={removablePurposes}
                        onRemove={(n) => onRemoveOption?.("purpose", n)}
                        placeholder="Select"
                        customPlaceholder="Type purpose"
                        {...purposeHandlers(commitment)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <AutoGrowTextarea
                        value={commitment.result}
                        onChange={(e) => onUpdateCommitment(commitment.id, "result", e.target.value)}
                        placeholder={
                          commitment.isPlaceholder
                            ? "Write the goal for these repeated actions"
                            : resultPlaceholder
                        }
                        className={`w-full rounded-lg border bg-white px-2.5 py-2 text-[15px] font-semibold leading-snug outline-none focus:border-red-600 ${
                          isMissing(commitment.id, "name") ? "border-red-600" : "border-black"
                        }`}
                      />
                      {showErrors && missingByRow[commitment.id] ? (
                        <p className="mt-1 text-[10px] font-semibold text-red-600">
                          ⚠ Missing: {rowMissingText(commitment.id)} — fill it or delete this goal.
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={commitment.targetDate}
                        min={minDate}
                        max={maxDate}
                        title="Must fall within this week"
                        onChange={(e) =>
                          onUpdateCommitment(
                            commitment.id,
                            "targetDate",
                            clampToRange(e.target.value, minDate, maxDate)
                          )
                        }
                        className={`w-full rounded-lg border bg-white px-1.5 py-1.5 text-xs ${
                          isMissing(commitment.id, "date") ? "border-red-600" : "border-black"
                        }`}
                      />
                    </td>
                    <td className="px-2 py-2 text-black">-</td>
                    <td className="px-2 py-2 text-black">-</td>
                    <td className="px-2 py-2 text-black">-</td>
                    <td className="px-2 py-2 text-black">-</td>
                    <td className="px-2 py-2 align-top">
                      {commitment.isPlaceholder ? (
                        <span className="text-xs text-black/40">—</span>
                      ) : (
                        <FrequencyField
                          isRepeat={commitment.isRepeat}
                          seriesLabel={commitment.seriesLabel}
                          frequency={commitment.frequency}
                          recurEnd={commitment.recurEnd}
                          recurCustom={commitment.recurCustom}
                          recurDays={commitment.recurDays}
                          targetDate={commitment.targetDate}
                          whatLabel="result"
                          allowedFrequencies={RESULT_FREQS}
                          onChange={(field, value) =>
                            onUpdateCommitment(commitment.id, field, value)
                          }
                        />
                      )}
                    </td>
                    {/* Colour coding is per-ACTION (only actions go to calendar). */}
                    <td className="px-2 py-2 text-center text-xs text-black/40">—</td>
                  </tr>

                  {!commitment.collapsed &&
                    subActions.map((action, actionIndex) => {
                      const hasConflict = conflictIds.has(action.id);
                      const ridesWithGoal =
                        isRecurring(commitment.frequency) &&
                        (commitment.recurSubIds || []).includes(action.id);
                      return (
                      <tr
                        key={action.id}
                        className={`border-b border-black align-top hover:bg-white ${
                          hasConflict ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-2 py-2">
                          <span className="ml-3 inline-flex rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {`${parentId}${actionIndex + 1}`}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <RowControls
                            compact
                            onMoveUp={() => onMoveAction(commitment.id, actionIndex, actionIndex - 1)}
                            onMoveDown={() => onMoveAction(commitment.id, actionIndex, actionIndex + 1)}
                            onDelete={() => onDeleteAction(action.id)}
                            canMoveUp={actionIndex > 0}
                            canMoveDown={actionIndex < subActions.length - 1}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <TagSelectField
                            options={categoryOptions}
                            removable={removableCategories}
                            onRemove={(n) => onRemoveOption?.("category", n)}
                            placeholder="Select"
                            customPlaceholder="Type category"
                            {...catHandlers(action, commitment)}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <TagSelectField
                            options={purposeOptions}
                            removable={removablePurposes}
                            onRemove={(n) => onRemoveOption?.("purpose", n)}
                            placeholder="Select"
                            customPlaceholder="Type purpose"
                            {...purposeHandlers(action, commitment)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <AutoGrowTextarea
                            value={action.description}
                            onChange={(e) => onUpdateAction(action.id, "description", e.target.value)}
                            placeholder={actionPlaceholder}
                            className={`w-full rounded-lg border bg-white px-2 py-1.5 text-sm leading-snug ${
                              isMissing(action.id, "name") ? "border-red-600" : "border-black"
                            }`}
                          />
                          {showErrors && missingByRow[action.id] ? (
                            <p className="mt-1 text-[10px] font-semibold text-red-600">
                              ⚠ Missing: {rowMissingText(action.id)} — fill it or delete this action.
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={action.executionDate}
                            min={minDate}
                            max={commitment.targetDate || maxDate}
                            title="Must fall within this week, on or before the goal's date"
                            onChange={(e) =>
                              onUpdateAction(
                                action.id,
                                "executionDate",
                                clampToRange(
                                  e.target.value,
                                  minDate,
                                  commitment.targetDate || maxDate
                                )
                              )
                            }
                            className={`w-full rounded-lg border bg-white px-1.5 py-1.5 text-xs ${
                              invalidDateIds.has(action.id) || isMissing(action.id, "date")
                                ? "border-red-600"
                                : "border-black"
                            }`}
                          />
                          {invalidDateIds.has(action.id) ? (
                            <p className="mt-1 text-[10px] font-semibold text-red-600">
                              ⚠ later than goal date
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <DurationField
                            value={action.duration}
                            onChange={(next) =>
                              handleActionFieldUpdate(action, "duration", next)
                            }
                            className={
                              isMissing(action.id, "duration")
                                ? "rounded-lg p-0.5 ring-2 ring-red-600"
                                : ""
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center">
                            <input
                              type="time"
                              value={action.startTime}
                              onChange={(e) =>
                                handleActionFieldUpdate(action, "startTime", e.target.value)
                              }
                              className={`w-full rounded-lg border bg-white px-1.5 py-1.5 text-xs ${
                                hasConflict || isMissing(action.id, "time")
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
                              value={action.endTime}
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
                            missing={isMissing(action.id, "delegate")}
                            value={action.assignedTo}
                            customValue={action.customDoneBy}
                            onChange={(val) => {
                              onUpdateAction(action.id, "assignedTo", val);
                              if (val !== "Other" && action.customDoneBy)
                                onUpdateAction(action.id, "customDoneBy", "");
                            }}
                            onChangeCustom={(text) => {
                              if (action.assignedTo !== "Other")
                                onUpdateAction(action.id, "assignedTo", "Other");
                              onUpdateAction(action.id, "customDoneBy", text);
                            }}
                            onClear={() => {
                              onUpdateAction(action.id, "assignedTo", "Self");
                              onUpdateAction(action.id, "customDoneBy", "");
                            }}
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          {action.isRepeat ? (
                            <FrequencyField
                              isRepeat
                              seriesLabel={action.seriesLabel}
                            />
                          ) : (
                            <div className="space-y-1.5">
                              {isRecurring(commitment.frequency) ? (
                                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-600 bg-white px-2 py-1.5 text-xs font-semibold text-black">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 accent-red-600"
                                    checked={ridesWithGoal}
                                    onChange={() => toggleRideWithGoal(commitment, action)}
                                  />
                                  Repeat with goal
                                </label>
                              ) : null}
                              {!ridesWithGoal ? (
                                <FrequencyField
                                  frequency={action.frequency}
                                  recurEnd={action.recurEnd}
                                  recurCustom={action.recurCustom}
                                  recurDays={action.recurDays}
                                  targetDate={action.executionDate}
                                  whatLabel="action"
                                  allowedFrequencies={ACTION_FREQS}
                                  showCarrierChoice
                                  carrierBlank={action.carrierBlank}
                                  onChange={(field, value) =>
                                    handleSubFreqChange(action, commitment, field, value)
                                  }
                                />
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <ColorField
                            value={action.colorKey}
                            onChange={(k) => onUpdateAction(action.id, "colorKey", k)}
                          />
                        </td>
                      </tr>
                      );
                    })}
                </Fragment>
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
            Some rows have missing fields, bad dates or a time clash — click Edit and fix them before exporting.
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
              {saveLabel}
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
                    ? "Fix missing fields, bad dates or time clashes first"
                    : "Open each Self action as a Google Calendar event"
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

export default UnifiedPlannerTable;
