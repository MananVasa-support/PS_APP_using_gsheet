import { useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import DurationField from "./fields/DurationField";
import LockedOverlay from "./fields/LockedOverlay";
import PlannerCard from "./PlannerCard";

const inputClass =
  "powerplanner-input w-full rounded-lg border border-black bg-white px-2 py-1.5 text-sm outline-none focus:border-red-600";

const ToStopWorkspace = ({
  stopDoingNow,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onSave,
  isEditing = true,
  onEdit,
  onCancel,
}) => {
  const [saveMessage, setSaveMessage] = useState("");

  const handleSave = () => {
    onSave?.();
    setSaveMessage("Saved.");
    window.setTimeout(() => setSaveMessage(""), 2500);
  };

  return (
    <PlannerCard
      title="To Stop"
      description={`Things I am doing which are Unproductive or "Not Worth My Time" — I will Stop Doing or Reduce my Time.`}
    >
      {!isEditing ? (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 border-b border-black pb-4">
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
      <button
        type="button"
        onClick={onAddRow}
        className="inline-flex items-center gap-2 rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-black hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FiPlus />
        Add Row
      </button>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-black">
            <tr>
              <th className="px-2 py-2">S. No.</th>
              <th className="px-2 py-2">What I Will Stop / Reduce</th>
              <th className="px-2 py-2">Weekly Time</th>
              <th className="px-2 py-2 text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {stopDoingNow.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-2 py-3 text-xs text-black">
                  No rows yet. Click “Add Row” to start.
                </td>
              </tr>
            ) : null}
            {stopDoingNow.map((row, index) => (
              <tr key={row.id} className="border-t border-black">
                <td className="px-2 py-2 text-xs">{index + 1}</td>
                <td className="px-2 py-2">
                  <input
                    className={inputClass}
                    value={row.detail}
                    onChange={(e) => onUpdateRow(row.id, "detail", e.target.value)}
                  />
                </td>
                <td className="px-2 py-2">
                  <DurationField
                    value={row.weeklyTime}
                    onChange={(next) => onUpdateRow(row.id, "weeklyTime", next)}
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveRow?.(row.id)}
                    title="Delete row"
                    aria-label="Delete row"
                    className="inline-flex items-center justify-center rounded-md border border-black p-1.5 text-black transition hover:bg-red-600 hover:border-red-600 hover:text-white"
                  >
                    <FiTrash2 className="text-sm" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </fieldset>
      <LockedOverlay active={!isEditing} />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3 border-t border-black pt-4">
        {saveMessage ? (
          <p className="text-xs font-medium text-black">{saveMessage}</p>
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
              onClick={handleSave}
              className="rounded-xl border border-red-600 bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black hover:border-black"
            >
              Save
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl border border-black bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 hover:border-red-600"
          >
            Edit
          </button>
        )}
      </div>
    </PlannerCard>
  );
};

export default ToStopWorkspace;
