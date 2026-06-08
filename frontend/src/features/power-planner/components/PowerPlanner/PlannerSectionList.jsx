import PlannerCard from "./PlannerCard";

const PlannerSectionList = ({ sections = [] }) => {
  return (
    <PlannerCard
      title="Planning Blocks"
      description="Scalable list structure for modular planning widgets."
      className="h-full"
    >
      <div className="space-y-4">
        {sections.map((section) => (
          <article key={section.id} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
            <h4 className="text-sm font-semibold text-zinc-900">{section.title}</h4>
            <p className="mt-1 text-sm text-zinc-600">{section.description}</p>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item} className="text-sm text-zinc-700">
                  - {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </PlannerCard>
  );
};

export default PlannerSectionList;
