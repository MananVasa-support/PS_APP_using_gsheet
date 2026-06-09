import MeetingApp from '@/features/meeting/App.jsx';

/**
 * Meeting Success Maximizer — mounted full-screen in its own light theme. Its
 * internal routes (/meeting-framework/*) are owned by MeetingApp. The back-to-
 * dashboard control lives inside the tool's layout (top of content, next to nav).
 */
export default function MeetingFramework() {
  return (
    <div className="tool-scope min-h-screen bg-surface font-meeting text-mkink [color-scheme:light]">
      <MeetingApp />
    </div>
  );
}
