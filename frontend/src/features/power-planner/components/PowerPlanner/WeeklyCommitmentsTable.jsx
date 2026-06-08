import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus } from "react-icons/fi";
import GapReasonField from "./fields/GapReasonField";
import ProgressField from "./fields/ProgressField";
import RowControls from "./fields/RowControls";
import PlannerCard from "./PlannerCard";

const WeeklyCommitmentsTable = ({
  commitments,
  commitmentIds,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  onToggleCollapse,
}) => {
  return (
    <PlannerCard
      title="Results I Am Committing To Produce This Week"
      description="Define measurable outcome-based commitments for the week."
      className="overflow-hidden p-0"
    >
      <div className="border-b border-zinc-100 px-5 py-4">
        <button
          type="button"
          onClick={() => onAdd()}
          className="powerplanner-add-btn inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <FiPlus />
          Add Commitment
        </button>
      </div>

      <div className="hidden lg:block">
        <div className="powerplanner-table-wrap overflow-x-auto">
          <table className="powerplanner-table w-full min-w-[1100px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur">
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">R. No.</th>
                <th className="px-4 py-3">Results I Am Committing To Produce This Week</th>
                <th className="px-4 py-3">Target Date</th>
                <th className="px-4 py-3">Done?</th>
                <th className="px-4 py-3">TFCR</th>
                <th className="px-4 py-3 text-right">Controls</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {commitments.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-zinc-100 align-top hover:bg-red-50/30"
                  >
                    <td className="px-4 py-4">
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-zinc-900 px-2 text-sm font-bold text-white">
                        {commitmentIds[index]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {!row.collapsed ? (
                        <textarea
                          value={row.result}
                          onChange={(e) => onUpdate(row.id, "result", e.target.value)}
                          rows={2}
                          placeholder="Result I am committing to produce this week"
                          className="powerplanner-input w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />
                      ) : (
                        <p className="text-sm text-zinc-500">Row collapsed</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {!row.collapsed && (
                        <input
                          type="date"
                          value={row.targetDate}
                          onChange={(e) => onUpdate(row.id, "targetDate", e.target.value)}
                          className="powerplanner-input w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 min-w-[180px]">
                      {!row.collapsed && (
                        <ProgressField
                          value={row.progress}
                          onChange={(val) => onUpdate(row.id, "progress", val)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-4 min-w-[170px]">
                      {!row.collapsed && row.progress < 1 && (
                        <GapReasonField
                          value={row.gapReason}
                          onChange={(val) => onUpdate(row.id, "gapReason", val)}
                        />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <RowControls
                        onInsertBelow={() => onAdd(index + 1)}
                        onMoveUp={() => onMove(index, index - 1)}
                        onMoveDown={() => onMove(index, index + 1)}
                        onDelete={() => onDelete(row.id)}
                        onToggleCollapse={() => onToggleCollapse(row.id)}
                        collapsed={row.collapsed}
                        canMoveUp={index > 0}
                        canMoveDown={index < commitments.length - 1}
                      />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 p-4 lg:hidden">
        <AnimatePresence initial={false}>
          {commitments.map((row, index) => (
            <motion.article
              key={row.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={clsx(
                "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm",
                row.collapsed && "opacity-80"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-lg bg-zinc-900 px-2.5 py-1 text-sm font-bold text-white">
                  {commitmentIds[index]}
                </span>
                <RowControls
                  compact
                  onInsertBelow={() => onAdd(index + 1)}
                  onMoveUp={() => onMove(index, index - 1)}
                  onMoveDown={() => onMove(index, index + 1)}
                  onDelete={() => onDelete(row.id)}
                  onToggleCollapse={() => onToggleCollapse(row.id)}
                  collapsed={row.collapsed}
                  canMoveUp={index > 0}
                  canMoveDown={index < commitments.length - 1}
                />
              </div>
              {!row.collapsed && (
                <div className="space-y-3">
                  <textarea
                    value={row.result}
                    onChange={(e) => onUpdate(row.id, "result", e.target.value)}
                    rows={3}
                    placeholder="Measurable weekly outcome"
                    className="powerplanner-input w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />
                  <input
                    type="date"
                    value={row.targetDate}
                    onChange={(e) => onUpdate(row.id, "targetDate", e.target.value)}
                    className="powerplanner-input w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <ProgressField
                    value={row.progress}
                    onChange={(val) => onUpdate(row.id, "progress", val)}
                  />
                  {row.progress < 1 && (
                    <GapReasonField
                      value={row.gapReason}
                      onChange={(val) => onUpdate(row.id, "gapReason", val)}
                    />
                  )}
                </div>
              )}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {commitments.length === 0 && (
        <p className="px-5 pb-6 text-sm text-zinc-500">
          No commitments yet. Use &quot;Add Commitment&quot; to create your first outcome row.
        </p>
      )}
    </PlannerCard>
  );
};

export default WeeklyCommitmentsTable;
