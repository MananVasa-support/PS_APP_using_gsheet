import { useAuthContext } from '@/context/AuthContext.jsx';

/** Convenience re-export so components import a single hook. */
export function useAuth() {
  return useAuthContext();
}
