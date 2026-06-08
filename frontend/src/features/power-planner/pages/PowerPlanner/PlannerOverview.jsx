import { PlannerChartPlaceholder, PlannerSectionList } from "../../components/PowerPlanner";

const PlannerOverview = ({ chartData, sections }) => {
  return (
    <div className="powerplanner-grid grid gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <PlannerChartPlaceholder data={chartData} />
      </div>
      <div className="xl:col-span-2">
        <PlannerSectionList sections={sections} />
      </div>
    </div>
  );
};

export default PlannerOverview;
