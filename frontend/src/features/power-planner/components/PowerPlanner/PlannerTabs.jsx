import clsx from "clsx";

const tabs = [
  { id: "topGoals", label: "Top Goals" },
  { id: "otherThings", label: "Other Things" },
  { id: "toStop", label: "To Stop" },
];

const PlannerTabs = ({ activeTab, onChange }) => {
  return (
    <div className="powerplanner-tabs inline-flex rounded-xl border border-black bg-white p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={clsx(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150",
            activeTab === tab.id
              ? "bg-red-600 text-white"
              : "bg-white text-black hover:bg-black hover:text-white"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default PlannerTabs;
