import { motion } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiPieChart,
} from "react-icons/fi";

const PlannerHeader = ({
  heading,
  description,
  periodLabel,
  onActionClick,
  actionLabel = "History",
  onPeriodClick,
  onReviewClick,
  reviewLabel = "Review",
  reviewActive = false,
  periodActive = false,
  historyActive = false,
  onTotalityClick,
  totalityLabel = "Totality",
  onHeadingClick,
  // When false, the Plan / Review / History / Totality nav buttons are hidden
  // (used on the start-date setup page before a plan exists).
  showNav = true,
}) => {
  // Uniform nav buttons: black by default, red when that section is active.
  const navClass = (active) =>
    `inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
      active
        ? "border-red-600 bg-red-600 text-white"
        : "border-black bg-black text-white hover:bg-red-600 hover:border-red-600"
    }`;
  return (
    <div className="space-y-3">
      {/* Back lives ABOVE / OUTSIDE the header card, not inside the box. */}
      {onHeadingClick ? (
        <button
          type="button"
          onClick={onHeadingClick}
          title="Back to menu"
          className="inline-flex items-center gap-1.5 rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors duration-150 hover:bg-red-600 hover:border-red-600 hover:text-white"
        >
          <FiArrowLeft />
          Back
        </button>
      ) : null}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`powerplanner-header relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-black bg-white p-6 md:flex-row md:items-center md:justify-between`}
      >
        <div className="space-y-1">
          <h1
          className={`text-2xl font-bold tracking-tight text-black ${
            onHeadingClick ? "cursor-pointer hover:text-red-600" : ""
          }`}
          onClick={onHeadingClick}
          title={onHeadingClick ? "Back to menu" : undefined}
        >
          {heading}
        </h1>
        <p className="text-sm text-black">{description}</p>
      </div>

      {showNav ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPeriodClick}
            title="Back to Top Goals"
            className={navClass(periodActive)}
          >
            <FiCalendar />
            {periodLabel}
          </button>
          {onReviewClick ? (
            <button
              type="button"
              onClick={onReviewClick}
              title="Open Weekly Review"
              className={navClass(reviewActive)}
            >
              <FiCheckCircle />
              {reviewLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onActionClick}
            className={navClass(historyActive)}
          >
            <FiClock />
            {actionLabel}
          </button>
          {onTotalityClick ? (
            <button
              type="button"
              onClick={onTotalityClick}
              title="Totality"
              className={navClass(false)}
            >
              <FiPieChart />
              {totalityLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      </motion.header>
    </div>
  );
};

export default PlannerHeader;
