import TimeFinderApp from '@/features/time-finder/App.jsx';

/**
 * Time Finder — mounted full-screen in its own light theme. Its internal routes
 * (/time-finder/*) are owned by TimeFinderApp. The back-to-dashboard control
 * lives inside the tool's layout (top of content, next to nav).
 */
export default function TimeFinderPage() {
  return (
    <div className="tool-scope min-h-screen font-sans">
      <TimeFinderApp />
    </div>
  );
}
