import { NavLink, Link } from 'react-router-dom';
import { FiTarget } from 'react-icons/fi';
import clsx from 'clsx';

const NAV = [
  { to: '/reason-eliminator', label: 'Reasons Eliminator', icon: <FiTarget /> },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-brand-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src="https://res.cloudinary.com/drwoydou3/image/upload/v1777300803/ChatGPT_Image_Apr_23_2026_11_54_33_PM_km0ken.png"
            alt="Altus Corp logo"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-brand-black tracking-tight">
              Altus Corp
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-black text-white'
                    : 'text-brand-gray-600 hover:text-brand-black hover:bg-brand-gray-100'
                )
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
