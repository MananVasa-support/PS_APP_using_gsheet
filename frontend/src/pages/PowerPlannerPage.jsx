import '@/features/power-planner/scoped.css';
import PowerPlannerApp from '@/features/power-planner/App.jsx';

/**
 * Power Planner — mounted full-screen in its own light theme so the merged tool
 * keeps its original look without fighting the dark shell.
 */
export default function PowerPlannerPage() {
  return (
    <div className="tool-scope min-h-screen bg-white font-sans text-black [color-scheme:light]">
      {/* Power Planner has its own native "Back" button (returns to its start
          screen), so it doesn't use the shared HubLink — avoids two back buttons.
          The shared navbar's logo handles returning to the dashboard. */}
      <PowerPlannerApp />
    </div>
  );
}
