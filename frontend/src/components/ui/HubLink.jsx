import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { guardNav } from '@/lib/navGuard';

/**
 * Uniform "back to dashboard" control for the full-screen tools. Rendered inline
 * at the top-left of each tool's content area (next to its left nav column), in
 * the app's brand red so it's consistent and visible across every tool.
 * Navigation runs through the global guard, so a tool with unsaved edits gets
 * to ask Save / Discard before the user leaves.
 */
export default function HubLink({ className = '' }) {
  const navigate = useNavigate();
  return (
    <Link
      to="/dashboard"
      title="Back to dashboard"
      onClick={(e) => {
        e.preventDefault();
        guardNav(() => navigate('/dashboard'));
      }}
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
