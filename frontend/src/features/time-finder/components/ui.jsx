import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';

// Shared Framer Motion interaction used by every button in the app.
export const press = { whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } };

export function PrimaryButton({ children, className = '', ...rest }) {
  return (
    <motion.button
      {...press}
      type="button"
      {...rest}
      className={
        'rounded-xl bg-red-500 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-red-500/25 transition-colors hover:bg-red-600 ' +
        className
      }
    >
      {children}
    </motion.button>
  );
}

export function OutlineButton({ children, className = '', ...rest }) {
  return (
    <motion.button
      {...press}
      type="button"
      {...rest}
      className={
        'rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 ' +
        className
      }
    >
      {children}
    </motion.button>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={'rounded-xl bg-white p-8 shadow-lg ring-1 ring-black/5 ' + className}>
      {children}
    </div>
  );
}

// Grey page background + centered, animated max-width container shared by all routes.
export function PageShell({ children }) {
  return (
    <div className="min-h-screen w-full bg-gray-100 px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mx-auto w-full max-w-[1100px]"
      >
        {children}
      </motion.div>
    </div>
  );
}

const NAV = [
  { to: '/', label: '1st Session', end: true },
  { to: '/adjust', label: 'Adjust' },
  { to: '/table', label: 'Table' },
  { to: '/dashboard', label: 'Dashboard' },
];

// Lightweight route switcher shown above each page card.
export function TopNav() {
  return (
    <nav className="mx-auto mb-6 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
      {NAV.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors ' +
            (isActive ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-100')
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
