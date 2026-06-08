import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRole, roleHome } from '@/utils/roles';
import Spinner from '@/components/ui/Spinner.jsx';

/**
 * Guards private routes.
 * - While the session is still being restored from storage → show a spinner
 *   (avoids a flash redirect to /login on every hard refresh).
 * - Unauthenticated → /login (remembers intended destination).
 * - Authenticated but Pending → /waiting (unless `allowPending`).
 * - `adminOnly`  → non-admins bounced to their own home.
 * - `roles={[…]}` → only the listed roles may enter; others bounced to their home.
 *   (Role names are normalized, so the legacy 'user' counts as 'client'.)
 */
export default function ProtectedRoute({ children, adminOnly = false, roles = null, allowPending = false }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-ink-950">
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowPending && user?.status === 'Pending') {
    return <Navigate to="/waiting" replace />;
  }

  const role = normalizeRole(user?.role);
  const allowed = adminOnly ? ['admin'] : roles?.map(normalizeRole) || null;

  if (allowed && !allowed.includes(role)) {
    return <Navigate to={roleHome(user?.role)} replace />;
  }

  return children;
}
