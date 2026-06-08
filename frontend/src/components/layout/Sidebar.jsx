import { useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiLogOut, FiChevronsLeft, FiAlertTriangle } from 'react-icons/fi';
import Logo from '@/components/ui/Logo.jsx';
import Avatar from '@/components/ui/Avatar.jsx';
import { Modal, Button } from '@/components/ui';
import { mainNav, adminMainNav, consultantMainNav, level2Nav, dangerNav } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

// Shared classes for a sidebar row (link or button).
const rowBase =
  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors';

function NavRow({ item, collapsed, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      end={item.to === '/dashboard'}
      className={({ isActive }) =>
        cn(
          rowBase,
          isActive ? 'text-white' : 'text-ink-400 hover:bg-ink-800 hover:text-slate-200',
          collapsed && 'justify-center'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              className="absolute inset-0 -z-0 rounded-xl bg-brand-500/15 ring-1 ring-brand-500/30"
            />
          )}
          <item.icon className={cn('relative z-10 h-5 w-5 shrink-0', isActive && 'text-brand-400')} />
          {!collapsed && <span className="relative z-10">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

/**
 * App sidebar. The visible items depend on the signed-in role:
 *   - admin      → Admin Panel, Analytics, Settings.
 *   - consultant → Participants, Settings (analytics live inside Participants).
 *   - client     → full feature set + Factory Reset, plus the Challenges
 *                  sub-links while inside that section.
 */
export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, isAdmin, isConsultant, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const showLevel2 = location.pathname.startsWith('/level-2');

  // Pick the nav list for the active role.
  const activeNav = isAdmin ? adminMainNav : isConsultant ? consultantMainNav : mainNav;
  // Factory Reset only makes sense for clients (who have local tracking data).
  const showDangerNav = !isAdmin && !isConsultant;
  // Logo lands on the role's home so admins/consultants don't bounce to /dashboard.
  const homePath = isAdmin ? '/admin' : isConsultant ? '/participants' : '/dashboard';

  function runDangerAction(key) {
    if (key === 'factory-reset') {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('ta_') || k.startsWith('ps_'))
        .forEach((k) => localStorage.removeItem(k));
      window.location.href = '/';
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-ink-700 bg-ink-900 transition-all duration-300',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Brand + collapse toggle. */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link to={homePath} onClick={onCloseMobile} aria-label="Go to home" className="rounded-xl">
            <Logo compact={collapsed} />
          </Link>
          <button
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white lg:block"
            aria-label="Toggle sidebar"
          >
            <FiChevronsLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Scrollable top nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 no-scrollbar">
          {activeNav.map((item) => (
            <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
          ))}

          {/* Challenges sub-links — revealed only while inside that section
              (clients only — admins/consultants never enter /level-2). */}
          {showLevel2 && !isAdmin && !isConsultant && (
            <div className="space-y-1 pt-2">
              {!collapsed && (
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                  Challenges
                </p>
              )}
              {level2Nav.map((item) => (
                <NavRow key={item.to} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
              ))}
            </div>
          )}
        </nav>

        {/* Pinned-to-bottom destructive actions (clients only) */}
        {showDangerNav && (
          <div className="space-y-1 border-t border-ink-700 px-3 py-3">
            {dangerNav.map((item) => (
              <button
                key={item.key}
                onClick={() => setConfirm(item)}
                className={cn(rowBase, 'w-full text-ink-400 hover:bg-unproductive/10 hover:text-unproductive', collapsed && 'justify-center')}
                title={item.label}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        )}

        {/* User mini-card */}
        <div className="border-t border-ink-700 p-3">
          <div className={cn('flex items-center gap-3 rounded-xl p-2', collapsed && 'justify-center')}>
            <Avatar name={user?.name} src={user?.avatar} size={36} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user?.name}</p>
                <p className="truncate text-xs text-ink-400">{user?.title || user?.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Logout — single sign-out entry point for every role, pinned to the
            very bottom of the sidebar. */}
        <div className="border-t border-ink-700 px-3 py-3">
          <button
            onClick={handleLogout}
            className={cn(rowBase, 'w-full text-ink-400 hover:bg-unproductive/10 hover:text-unproductive', collapsed && 'justify-center')}
            title="Log out"
            aria-label="Log out"
          >
            <FiLogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Confirmation modal for destructive actions */}
      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.label}
        subtitle={
          confirm?.key === 'factory-reset'
            ? 'This erases all local data and signs you out. This cannot be undone.'
            : 'This permanently removes your past time logs. This cannot be undone.'
        }
        icon={FiAlertTriangle}
        tone="danger"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => runDangerAction(confirm.key)}>
              {confirm?.key === 'factory-reset' ? 'Reset everything' : 'Delete logs'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-300">
          {confirm?.key === 'factory-reset'
            ? 'Are you sure you want to factory reset? Your profile, onboarding draft and challenge progress will be cleared.'
            : 'Are you sure you want to delete all past logs?'}
        </p>
      </Modal>
    </>
  );
}
