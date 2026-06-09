import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

/**
 * Uniform "back to dashboard" control for the full-screen tools. Rendered inline
 * at the top-left of each tool's content area (next to its left nav column), in
 * the app's brand red so it's consistent and visible across every tool.
 */
export default function HubLink({ className = '' }) {
  return (
    <Link
      to="/dashboard"
      title="Back to dashboard"
      className={
        'inline-flex items-center gap-1.5 rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors duration-150 hover:bg-red-600 hover:border-red-600 hover:text-white ' +
        className
      }
    >
      <FiArrowLeft />
      Back
    </Link>
  );
}
