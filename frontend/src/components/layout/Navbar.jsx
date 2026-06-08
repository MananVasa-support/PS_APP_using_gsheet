import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiMenu, FiSearch, FiBell, FiUser, FiSettings, FiSun, FiMoon, FiLogOut } from 'react-icons/fi';
import Avatar from '@/components/ui/Avatar.jsx';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext.jsx';
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
export default function Navbar({ onOpenMobile, leading }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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

  const notifications = [
    { id: 1, text: 'Your weekly report is ready.', time: '2m ago' },
    { id: 2, text: 'Sarah Johnson requested approval.', time: '1h ago' },
    { id: 3, text: 'You hit a 12-day streak 🔥', time: '3h ago' },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-700 bg-ink-900/80 px-4 backdrop-blur-xl">
      {/* Only shown when a sidebar exists to open (i.e. inside DashboardLayout).
          The no-sidebar HomeLayout renders this Navbar without onOpenMobile. */}
      {onOpenMobile && (
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <FiMenu className="h-5 w-5" />
        </button>
      )}

      {leading}

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          placeholder="Search entries, reports, people…"
          className="input-base pl-10"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-sm text-ink-400 md:block">{formatDate(new Date())}</span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-400 hover:bg-ink-800 hover:text-white"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'dark' ? (
              <motion.span key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <FiMoon className="h-5 w-5" />
              </motion.span>
            ) : (
              <motion.span key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <FiSun className="h-5 w-5" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-white"
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
                <p className="border-b border-ink-700 px-4 py-3 text-sm font-semibold text-white">
                  Notifications
                </p>
                <ul className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="flex gap-3 px-4 py-3 hover:bg-ink-800">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                      <div>
                        <p className="text-sm text-slate-200">{n.text}</p>
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
              <span className="block text-sm font-medium leading-tight text-white">{user?.name}</span>
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
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-ink-800">
                  <FiUser className="h-4 w-4 text-ink-400" /> My Profile
                </Link>
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-ink-800">
                  <FiSettings className="h-4 w-4 text-ink-400" /> Settings
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 border-t border-ink-700 px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-unproductive/10 hover:text-unproductive"
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
