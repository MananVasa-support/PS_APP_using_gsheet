import MeetingApp from '@/features/meeting/App.jsx';
import HubLink from '@/components/ui/HubLink.jsx';

/**
 * Meeting Success Maximizer — mounted full-screen in its own light theme
 * (Outfit font). Its internal routes (/meeting-framework/*) are owned by
 * MeetingApp.
 */
export default function MeetingFramework() {
  return (
    <div className="min-h-screen bg-surface font-meeting text-mkink">
      <HubLink />
      <MeetingApp />
    </div>
  );
}
