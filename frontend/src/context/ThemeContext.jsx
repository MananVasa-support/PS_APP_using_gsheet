import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext(null);

/**
 * Theme. The dark/night theme was removed by request — the app is light-only.
 * We keep this provider (and a no-op toggle/setter) so existing consumers don't
 * break, and we pin <html> to the light palette. Pre-login/public pages opt
 * into a dark look locally via the `.always-dark` scope in index.css.
 */
export function ThemeProvider({ children }) {
  const theme = 'light';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    localStorage.setItem('ps_theme', 'light');
  }, []);

  // Dark mode is gone, so toggling/setting is intentionally a no-op.
  const noop = () => {};

  return (
    <ThemeContext.Provider value={{ theme, setTheme: noop, toggleTheme: noop }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
