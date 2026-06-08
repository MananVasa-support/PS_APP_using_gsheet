import {
  FiGrid,
  FiPieChart,
  FiAward,
  FiDownload,
  FiSettings,
  FiShield,
  FiUsers,
  FiActivity,
  FiBarChart2,
  FiTrendingUp,
  FiFileText,
  FiRefreshCcw,
} from 'react-icons/fi';

/**
 * Sidebar navigation, grouped by role.
 *
 * - `mainNav`           : client (default) — full app feature set.
 * - `adminMainNav`      : admin — only Admin Panel, Analytics, Settings.
 *                         Client-flow items (Dashboard, Challenges, Reports,
 *                         Final Summary) are intentionally hidden.
 * - `consultantMainNav` : consultant — only Participants and Settings.
 *                         Per-participant analytics live INSIDE the
 *                         Participants page, so a separate Analytics row is
 *                         unnecessary.
 * - `level2Nav`         : ranking/analysis sub-links — shown ONLY while inside
 *                         the Challenges (Level 2) section.
 * - `dangerNav`         : destructive actions for clients only (clears local
 *                         tracking data). Pinned to the bottom of the sidebar.
 *
 * "Challenges" (label) maps to the existing /level-2 flow.
 */
export const mainNav = [
  { label: 'Dashboard', to: '/dashboard', icon: FiGrid },
  { label: 'Analytics', to: '/analytics', icon: FiPieChart },
  { label: 'Challenges', to: '/level-2', icon: FiAward },
  { label: 'Export Reports', to: '/reports', icon: FiDownload },
  { label: 'Final Summary', to: '/final-summary', icon: FiFileText },
  { label: 'Settings', to: '/settings', icon: FiSettings },
];

export const adminMainNav = [
  { label: 'Admin Panel', to: '/admin', icon: FiShield },
  { label: 'Analytics', to: '/analytics', icon: FiPieChart },
  { label: 'Challenges', to: '/level-2', icon: FiAward },
  { label: 'Settings', to: '/settings', icon: FiSettings },
];

export const consultantMainNav = [
  { label: 'Participants', to: '/participants', icon: FiUsers },
  { label: 'Challenges', to: '/level-2', icon: FiAward },
  { label: 'Settings', to: '/settings', icon: FiSettings },
];

export const level2Nav = [
  { label: 'Analysis', to: '/level-2/analysis', icon: FiActivity },
  { label: 'Top 3 Rankings', to: '/level-2/top-3', icon: FiAward },
  { label: 'Top 4 Rankings', to: '/level-2/top-4', icon: FiBarChart2 },
  { label: 'Performance Board', to: '/level-2/performance', icon: FiTrendingUp },
];

export const dangerNav = [
  { key: 'factory-reset', label: 'Factory Reset', icon: FiRefreshCcw },
];
