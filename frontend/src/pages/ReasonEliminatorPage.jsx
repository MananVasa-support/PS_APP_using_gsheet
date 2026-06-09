import '@/features/reason-eliminator/scoped.css';
import ReasonEliminatorApp from '@/features/reason-eliminator/App.jsx';

/**
 * Reasons Eliminator — mounted full-screen in its own light theme. Its internal
 * routes (/reason-eliminator/*) are owned by ReasonEliminatorApp. The back-to-
 * dashboard control lives inside the tool's layout (top of content, next to nav).
 */
export default function ReasonEliminatorPage() {
  return (
    <div className="tool-scope min-h-screen bg-brand-gray-50 font-sans text-brand-ink [color-scheme:light]">
      <ReasonEliminatorApp />
    </div>
  );
}
