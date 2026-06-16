import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'ps_theme';

/**
 * App theme — dark / light, app-wide. The actual palette lives in CSS variables
 * (see index.css `:root/html.dark` and `html.light`), so flipping the class on
 * <html> re-themes the entire shell AND the merged tools (tool-scope dark
 * overrides). Public/auth pages opt into a fixed dark look via `.always-dark`.
 *
 * The choice is remembered in localStorage. Default is dark (matches the
 * always-dark login screen for a cohesive entry into the app).
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = (t) => setThemeState(t === 'light' ? 'light' : 'dark');
  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
