import clsx from "clsx";
import { motion } from "framer-motion";
import { powerPlannerSurfaceClass } from "./powerPlannerClassNames";

const PlannerCard = ({ title, description, children, className }) => {
  return (
    <motion.section
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={clsx(
        "powerplanner-card p-5",
        powerPlannerSurfaceClass,
        className
      )}
    >
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title && <h3 className="text-base font-semibold text-black">{title}</h3>}
          {description && <p className="text-sm text-black">{description}</p>}
        </header>
      )}
      <div>{children}</div>
    </motion.section>
  );
};

export default PlannerCard;
