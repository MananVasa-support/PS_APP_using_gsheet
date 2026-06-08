import clsx from "clsx";
import { motion } from "framer-motion";
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiChevronRight,
  FiTrash2,
} from "react-icons/fi";

const RowControls = ({
  onMoveUp,
  onMoveDown,
  onDelete,
  onToggleCollapse,
  collapsed,
  canMoveUp,
  canMoveDown,
  compact = false,
  // When the surrounding section is locked it's covered by a click-catching
  // overlay. `liftCollapse` raises ONLY this toggle above that overlay so the
  // user can still hide/show sub-tasks without entering edit mode.
  liftCollapse = false,
}) => {
  const btnClass =
    "inline-flex flex-shrink-0 items-center justify-center rounded-md border border-black bg-white p-1.5 text-black transition hover:border-red-600 hover:bg-red-600 hover:text-white focus:outline-none";

  return (
    <motion.div
      layout
      className={clsx(
        "powerplanner-row-controls flex flex-nowrap items-center gap-1 whitespace-nowrap",
        compact ? "justify-start" : "justify-end"
      )}
    >
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        className={clsx(btnClass, !canMoveUp && "cursor-not-allowed opacity-40")}
        title="Move up"
      >
        <FiArrowUp />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        className={clsx(btnClass, !canMoveDown && "cursor-not-allowed opacity-40")}
        title="Move down"
      >
        <FiArrowDown />
      </button>
      {onToggleCollapse ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          className={clsx(btnClass, liftCollapse && "relative z-30")}
          title={collapsed ? "Show actions" : "Hide actions"}
        >
          {collapsed ? <FiChevronRight /> : <FiChevronDown />}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        className={btnClass}
        title="Delete row"
      >
        <FiTrash2 />
      </button>
      {collapsed && (
        <span className={clsx(
          "ml-1 rounded-md border border-black bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-black",
          liftCollapse && "relative z-30"
        )}>
          Hidden
        </span>
      )}
    </motion.div>
  );
};

export default RowControls;
