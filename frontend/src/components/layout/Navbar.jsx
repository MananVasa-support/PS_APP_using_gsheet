import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiSearch, FiBell, FiSettings, FiLogOut } from 'react-icons/fi';
import Avatar from '@/components/ui/Avatar.jsx';
import { useAuth } from '@/hooks/useAuth';
import { useClickOutside } from '@/hooks/useClickOutside';
import { formatDate } from '@/utils/format';

/**
 * Top navigation bar: optional menu button / leading slot, search, date,
 * notifications, profile menu.
 *
 * @param onOpenMobile  When provided, shows the mobile sidebar-toggle button
 *                      (used inside DashboardLayout). Omitted on the no-sidebar home.
 * @param leading       Optional element rendered at the far left (e.g. the Logo on
 *                      the sidebar-less Home, so the brand shows "everywhere").
 */
// The dashboard search jumps only to the tool cards shown on the hub page —
// keep this list in sync with MODULES in pages/Dashboard.jsx.
const SEARCH_DESTINATIONS = [
  { label: 'Totality Collector', to: '/pre-ps/totality' },
  { label: 'Sales Cultivator', to: '/sales-cultivator' },
  { label: 'Time Auditor', to: '/time-auditor' },
  { label: 'Power Planner', to: '/power-planner' },
  { label: 'Reasons Eliminator', to: '/reason-eliminator' },
  { label: 'Time Finder', to: '/time-finder' },
  { label: 'Meeting Success Maximizer', to: '/meeting-framework' },
  { label: 'Personal Space', to: '/personal-space' },
];

export default function Navbar({ onOpenMobile, leading, showSearch = true }) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);
  // The search lives only on the dashboard hub.
  const onDashboard = location.pathname === '/dashboard';
  const searchResults = query.trim()
    ? SEARCH_DESTINATIONS.filter((d) => d.label.toLowerCase().includes(query.trim().toLowerCase()))
    : [];
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    setMenuOpen(false);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false));
  useClickOutside(notifRef, () => setNotifOpen(false));
  useClickOutside(searchRef, () => setQuery(''));

  const notifications = [
    { id: 1, text: 'Your weekly report is ready.', time: '2m ago' },
    { id: 2, text: 'Sarah Johnson requested approval.', time: '1h ago' },
    { id: 3, text: 'You hit a 12-day streak 🔥', time: '3h ago' },
  ];

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-3 border-b border-ink-700 bg-ink-900/80 px-4 backdrop-blur-xl">
      {/* Only shown when a sidebar exists to open (i.e. inside DashboardLayout).
          The no-sidebar HomeLayout renders this Navbar without onOpenMobile. */}
      {onOpenMobile && (
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-fg-strong lg:hidden"
          aria-label="Open menu"
        >
          <FiMenu className="h-5 w-5" />
        </button>
      )}

      {leading}

      {/* Search — only on the dashboard hub, and it actually navigates. */}
      {showSearch && onDashboard ? (
        <div ref={searchRef} className="relative hidden max-w-md flex-1 sm:block">
          <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools & pages…"
            className="input-base pl-10"
          />
          {query.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-ink-700 bg-ink-900 shadow-card">
              {searchResults.length ? (
                searchResults.map((r) => (
                  <button
                    key={r.to}
                    type="button"
                    onClick={() => {
                      setQuery('');
                      navigate(r.to);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-fg hover:bg-ink-800"
                  >
                    <FiSearch className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    {r.label}
                  </button>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-ink-400">No matches for “{query}”.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm text-ink-400 md:block">{formatDate(new Date())}</span>

        {/* Theme toggle removed — the app is light-only now. */}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-fg-strong"
            aria-label="Notifications"
          >
            <FiBell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-ink-900" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-ink-700 bg-ink-850 shadow-card"
              >
                <p className="border-b border-ink-700 px-4 py-3 text-sm font-semibold text-fg-strong">
                  Notifications
                </p>
                <ul className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="flex gap-3 px-4 py-3 hover:bg-ink-800">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <p className="text-sm text-fg">{n.text}</p>
                        <p className="text-xs text-ink-400">{n.time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-ink-800"
          >
            <Avatar name={user?.name} src={user?.avatar} size={34} />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight text-fg-strong">{user?.name}</span>
              <span className="block text-xs leading-tight text-ink-400 capitalize">{user?.role}</span>
            </span>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-ink-700 bg-ink-850 py-1 shadow-card"
              >
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg hover:bg-ink-800">
                  <FiSettings className="h-4 w-4 text-ink-400" /> Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 border-t border-ink-700 px-4 py-2.5 text-left text-sm text-fg hover:bg-unproductive/10 hover:text-unproductive"
                >
                  <FiLogOut className="h-4 w-4 text-ink-400" /> Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
