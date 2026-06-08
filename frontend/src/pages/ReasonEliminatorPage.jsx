import '@/features/reason-eliminator/scoped.css';
import ReasonEliminatorApp from '@/features/reason-eliminator/App.jsx';
import HubLink from '@/components/ui/HubLink.jsx';

/**
 * Reasons Eliminator — mounted full-screen in its own light theme. Its internal
 * routes (/reason-eliminator/*) are owned by ReasonEliminatorApp.
 */
export default function ReasonEliminatorPage() {
  return (
    <div className="min-h-screen bg-brand-gray-50 font-sans text-brand-ink">
      <HubLink />
      <ReasonEliminatorApp />
    </div>
  );
}
