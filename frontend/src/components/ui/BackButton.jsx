import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Button from './Button.jsx';

/**
 * Small ghost-style Back button used at the top of in-app pages. Uses browser
 * history (navigate(-1)) and falls back to a sensible default if there is no
 * prior in-app entry — e.g. on a hard refresh — so the user is never stranded.
 */
export default function BackButton({ to = '/dashboard', className }) {
  const navigate = useNavigate();

  function handleClick() {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
    } else {
      navigate(to, { replace: true });
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      icon={FiArrowLeft}
      className={['-ml-2', className].filter(Boolean).join(' ')}
    >
      Back
    </Button>
  );
}
