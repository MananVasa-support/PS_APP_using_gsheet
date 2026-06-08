import clsx from "clsx";
import {
  powerPlannerContainerClass,
  powerPlannerSectionPaddingClass,
} from "./powerPlannerClassNames";

const PlannerLayout = ({ children }) => {
  return (
    <section className={clsx("powerplanner-layout min-h-full bg-white", powerPlannerSectionPaddingClass)}>
      <div className={powerPlannerContainerClass}>{children}</div>
    </section>
  );
};

export default PlannerLayout;
