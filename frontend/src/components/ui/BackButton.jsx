import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

/**
 * Small ghost-style Back button used at the top of in-app pages. Uses browser
 * history (navigate(-1)) and falls back to a sensible default if there is no
 * prior in-app entry — e.g. on a hard refresh — so the user is never stranded.
 */
export default function BackButton({ to = '/dashboard', onClick, label = 'Back', className }) {
  const navigate = useNavigate();

  function handleClick() {
    // An explicit onClick (e.g. a tool's internal step-back) takes precedence
    // over browser-history navigation.
    if (onClick) {
      onClick();
      return;
    }
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(to, { replace: true });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border border-black bg-white px-3 py-1.5 text-xs font-semibold text-black transition-colors duration-150 hover:bg-red-600 hover:border-red-600 hover:text-white',
        className,
      ].filter(Boolean).join(' ')}
    >
      <FiArrowLeft />
      {label}
    </button>
  );
}
