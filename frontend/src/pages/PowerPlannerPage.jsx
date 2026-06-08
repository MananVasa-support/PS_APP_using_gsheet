import '@/features/power-planner/scoped.css';
import PowerPlannerApp from '@/features/power-planner/App.jsx';
import HubLink from '@/components/ui/HubLink.jsx';

/**
 * Power Planner — mounted full-screen in its own light theme so the merged tool
 * keeps its original look without fighting the dark shell.
 */
export default function PowerPlannerPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-black">
      <HubLink />
      <PowerPlannerApp />
    </div>
  );
}
