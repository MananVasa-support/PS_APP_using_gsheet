import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronDown, FiChevronRight, FiPlus } from "react-icons/fi";
import { ASSIGNEE_OPTIONS } from "../../data/powerPlannerConstants";
import DurationField from "./fields/DurationField";
import GapReasonField from "./fields/GapReasonField";
import ProgressField from "./fields/ProgressField";
import RowControls from "./fields/RowControls";
import PlannerCard from "./PlannerCard";

const ActionExecutionTable = ({
  commitments,
  commitmentIds,
  getActionsByParent,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onMoveAction,
  onToggleActionCollapse,
}) => {
  return (
    <PlannerCard
      title="Actions I Am Committing To Take"
      description="Break commitments into executable scheduled action steps."
      className="overflow-hidden p-0"
    >
      {commitments.length === 0 ? (
        <p className="px-5 py-6 text-sm text-zinc-500">
          Add at least one weekly commitment to begin scheduling action steps.
        </p>
      ) : (
        <div className="space-y-6 p-4 md:p-5">
          {commitments.map((commitment, parentIndex) => (
            <ActionGroup
              key={commitment.id}
              parentId={commitmentIds[parentIndex]}
              commitmentLabel={commitment.result || "Untitled commitment"}
              parentActions={getActionsByParent(commitment.id)}
              onAddAction={(insertIndex) => onAddAction(commitment.id, insertIndex)}
              onUpdateAction={onUpdateAction}
              onDeleteAction={onDeleteAction}
              onMoveAction={(from, to) => onMoveAction(commitment.id, from, to)}
              onToggleActionCollapse={onToggleActionCollapse}
            />
          ))}
        </div>
      )}
    </PlannerCard>
  );
};

const ActionGroup = ({
  parentId,
  commitmentLabel,
  parentActions,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onMoveAction,
  onToggleActionCollapse,
}) => {
  const [groupOpen, setGroupOpen] = useState(true);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60">
      <header className="sticky top-0 z-[5] flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setGroupOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 text-left"
        >
          {groupOpen ? (
            <FiChevronDown className="text-red-600" />
          ) : (
            <FiChevronRight className="text-red-600" />
          )}
          <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-sm font-bold text-white">
            {parentId}
          </span>
          <span className="text-sm font-medium text-zinc-700">{commitmentLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => onAddAction()}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          <FiPlus />
          Add Action
        </button>
      </header>

      <AnimatePresence initial={false}>
        {groupOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="hidden overflow-x-auto xl:block">
              <table className="powerplanner-table w-full min-w-[1400px] border-collapse text-left">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr className="border-b border-zinc-200">
                    <th className="px-3 py-3">R. No.</th>
                    <th className="px-3 py-3">A. No.</th>
                    <th className="px-3 py-3">Actions I Am Committing To Take</th>
                    <th className="px-3 py-3">Execution Date</th>
                    <th className="px-3 py-3">Duration</th>
                    <th className="px-3 py-3">From</th>
                    <th className="px-3 py-3">To</th>
                    <th className="px-3 py-3">Schedule / Delegate</th>
                    <th className="px-3 py-3">Done?</th>
                    <th className="px-3 py-3">TFCR</th>
                    <th className="px-3 py-3 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {parentActions.map((row, index) => (
                    <ActionTableRow
                      key={row.id}
                      row={row}
                      parentId={parentId}
                      actionId={`${parentId}${index + 1}`}
                      index={index}
                      total={parentActions.length}
                      onUpdate={onUpdateAction}
                      onDelete={onDeleteAction}
                      onMove={onMoveAction}
                      onToggleCollapse={onToggleActionCollapse}
                      onInsertBelow={() => onAddAction(index + 1)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 xl:hidden">
              {parentActions.map((row, index) => (
                <ActionMobileCard
                  key={row.id}
                  row={row}
                  parentId={parentId}
                  actionId={`${parentId}${index + 1}`}
                  index={index}
                  total={parentActions.length}
                  onUpdate={onUpdateAction}
                  onDelete={onDeleteAction}
                  onMove={onMoveAction}
                  onToggleCollapse={onToggleActionCollapse}
                  onInsertBelow={() => onAddAction(index + 1)}
                />
              ))}
            </div>

            {parentActions.length === 0 && (
              <p className="px-4 py-5 text-sm text-zinc-500">
                No actions for goal {parentId}. Click &quot;Add Action&quot; to schedule execution steps.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const ActionTableRow = ({
  row,
  parentId,
  actionId,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onToggleCollapse,
  onInsertBelow,
}) => (
  <motion.tr
    layout
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="border-b border-zinc-100 align-top hover:bg-white"
  >
    <td className="px-3 py-3">
      <span className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-bold text-zinc-800">
        {parentId}
      </span>
    </td>
    <td className="px-3 py-3">
      <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
        {actionId}
      </span>
    </td>
    <td className="min-w-[220px] px-3 py-3">
      {!row.collapsed && (
        <textarea
          value={row.description}
          onChange={(e) => onUpdate(row.id, "description", e.target.value)}
          rows={2}
          placeholder="Describe executable action step"
          className="powerplanner-input w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
        />
      )}
    </td>
    <td className="px-3 py-3">
      {!row.collapsed && (
        <input
          type="date"
          value={row.executionDate}
          onChange={(e) => onUpdate(row.id, "executionDate", e.target.value)}
          className="powerplanner-input w-full rounded-xl border border-zinc-200 px-2 py-2 text-sm"
        />
      )}
    </td>
    <td className="px-3 py-3">
      {!row.collapsed && (
        <DurationField
          value={row.duration}
          onChange={(next) => onUpdate(row.id, "duration", next)}
        />
      )}
    </td>
    <td className="px-3 py-3">
      {!row.collapsed && (
        <input
          type="time"
          value={row.startTime}
          onChange={(e) => onUpdate(row.id, "startTime", e.target.value)}
          className="powerplanner-input w-full rounded-xl border border-zinc-200 px-2 py-2 text-sm"
        />
      )}
    </td>
    <td className="px-3 py-3">
      {!row.collapsed && (
        <input
          type="time"
          value={row.endTime}
          onChange={(e) => onUpdate(row.id, "endTime", e.target.value)}
          className="powerplanner-input w-full rounded-xl border border-zinc-200 px-2 py-2 text-sm"
        />
      )}
    </td>
    <td className="px-3 py-3">
      {!row.collapsed && (
        <select
          value={row.assignedTo}
          onChange={(e) => onUpdate(row.id, "assignedTo", e.target.value)}
          className="powerplanner-select w-full rounded-xl border border-zinc-200 px-2 py-2 text-sm"
        >
          {ASSIGNEE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
    </td>
    <td className="min-w-[170px] px-3 py-3">
      {!row.collapsed && (
        <ProgressField
          compact
          value={row.progress}
          onChange={(val) => onUpdate(row.id, "progress", val)}
        />
      )}
    </td>
    <td className="min-w-[150px] px-3 py-3">
      {!row.collapsed && row.progress < 1 && (
        <GapReasonField
          value={row.gapReason}
          onChange={(val) => onUpdate(row.id, "gapReason", val)}
        />
      )}
    </td>
    <td className="px-3 py-3">
      <RowControls
        onInsertBelow={onInsertBelow}
        onMoveUp={() => onMove(index, index - 1)}
        onMoveDown={() => onMove(index, index + 1)}
        onDelete={() => onDelete(row.id)}
        onToggleCollapse={() => onToggleCollapse(row.id)}
        collapsed={row.collapsed}
        canMoveUp={index > 0}
        canMoveDown={index < total - 1}
      />
    </td>
  </motion.tr>
);

const ActionMobileCard = ({
  row,
  parentId,
  actionId,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
  onToggleCollapse,
  onInsertBelow,
}) => (
  <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-bold">{parentId}</span>
        <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
          {actionId}
        </span>
      </div>
      <RowControls
        compact
        onInsertBelow={onInsertBelow}
        onMoveUp={() => onMove(index, index - 1)}
        onMoveDown={() => onMove(index, index + 1)}
        onDelete={() => onDelete(row.id)}
        onToggleCollapse={() => onToggleCollapse(row.id)}
        collapsed={row.collapsed}
        canMoveUp={index > 0}
        canMoveDown={index < total - 1}
      />
    </div>
    {!row.collapsed && (
      <div className="grid gap-3 sm:grid-cols-2">
        <textarea
          value={row.description}
          onChange={(e) => onUpdate(row.id, "description", e.target.value)}
          rows={2}
          placeholder="Action description"
          className="powerplanner-input sm:col-span-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
        <select
          value={row.assignedTo}
          onChange={(e) => onUpdate(row.id, "assignedTo", e.target.value)}
          className="powerplanner-select rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        >
          {ASSIGNEE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={row.executionDate}
          onChange={(e) => onUpdate(row.id, "executionDate", e.target.value)}
          className="powerplanner-input rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
        <DurationField
          value={row.duration}
          onChange={(next) => onUpdate(row.id, "duration", next)}
        />
        <input
          type="time"
          value={row.startTime}
          onChange={(e) => onUpdate(row.id, "startTime", e.target.value)}
          className="powerplanner-input rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={row.endTime}
          onChange={(e) => onUpdate(row.id, "endTime", e.target.value)}
          className="powerplanner-input rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
        <div className="sm:col-span-2">
          <ProgressField value={row.progress} onChange={(val) => onUpdate(row.id, "progress", val)} />
        </div>
        {row.progress < 1 && (
          <div className="sm:col-span-2">
            <GapReasonField
              value={row.gapReason}
              onChange={(val) => onUpdate(row.id, "gapReason", val)}
            />
          </div>
        )}
      </div>
    )}
  </article>
);

export default ActionExecutionTable;
