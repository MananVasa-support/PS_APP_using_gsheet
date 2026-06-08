import TimeFinderApp from '@/features/time-finder/App.jsx';
import HubLink from '@/components/ui/HubLink.jsx';

/**
 * Time Finder — mounted full-screen in its own light theme. Its internal routes
 * (/time-finder/*) are owned by TimeFinderApp.
 */
export default function TimeFinderPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-tfink-900">
      <HubLink />
      <TimeFinderApp />
    </div>
  );
}
