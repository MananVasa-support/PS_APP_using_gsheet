import { PowerPlannerHome } from "./pages/PowerPlanner";

/**
 * Power Planner feature root. The original standalone <BrowserRouter> was
 * removed during the merge — routing is owned by the shell. Power Planner is a
 * single screen, so we just render its home directly.
 */
export default function PowerPlannerApp() {
  return <PowerPlannerHome />;
}
