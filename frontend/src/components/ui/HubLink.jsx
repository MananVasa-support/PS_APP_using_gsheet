import { Link } from 'react-router-dom';
import { FiGrid } from 'react-icons/fi';

/**
 * Small fixed pill that returns the user from a full-screen tool back to the
 * dashboard hub (/home). Each merged tool renders full-screen with its own
 * layout, so this is the consistent way back to the module picker.
 */
export default function HubLink() {
  return (
    <Link
      to="/home"
      title="Back to dashboard"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-lg backdrop-blur transition-colors hover:bg-white hover:text-black"
    >
      <FiGrid className="h-4 w-4" />
      Hub
    </Link>
  );
}
