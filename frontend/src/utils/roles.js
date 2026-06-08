/**
 * Frontend role helpers — mirror of server/src/utils/roles.js.
 *
 * Three logical roles: admin, consultant, client. The legacy role name 'user'
 * is treated as 'client' everywhere for backward compatibility.
 */

// Options shown in the login role selector.
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'client', label: 'Client' },
];

export function normalizeRole(role) {
  return role === 'user' ? 'client' : role;
}

export const isAdmin = (role) => role === 'admin';
export const isConsultant = (role) => role === 'consultant';
export const isClient = (role) => role === 'client' || role === 'user';

/** The landing route for a given role after login / when bounced from a page. */
export function roleHome(role) {
  if (isAdmin(role)) return '/admin';
  if (isConsultant(role)) return '/dashboard';
  return '/dashboard';
}
