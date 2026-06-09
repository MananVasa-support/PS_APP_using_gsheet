/** @type {import('tailwindcss').Config} */

// ── Strict brand system: RED + BLACK + WHITE + GRAY only ────────────────────
// The whole merged app uses ONE red for every accent and TRUE grays for every
// neutral. Stray colour families (green/blue/purple/amber/…) are remapped to RED
// below, so no other hue can appear anywhere across the shell or the 5 tools.
const RED = {
  50: '#fff1f2',
  100: '#ffe1e3',
  200: '#ffc8cc',
  300: '#ffa1a8',
  400: '#ff6b76',
  500: '#f93b48',
  600: '#e51d2b',
  700: '#c11420',
  800: '#a0141f',
  900: '#84171f',
  950: '#48070b',
  DEFAULT: '#e51d2b',
};

const GRAY = {
  50: '#f7f7f8',
  100: '#efeff1',
  200: '#e4e4e7',
  300: '#d1d1d6',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#0b0b0c',
};

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Single brand red. All the tools' different reds + named aliases
        // collapse onto this one red so the app reads as one product.
        brand: {
          ...RED,
          dark: RED[700],
          soft: RED[50],
          red: RED[600],
          'red-light': RED[500],
          'red-dark': RED[700],
          'red-soft': RED[50],
          'red-tint': RED[50],
          black: '#0b0b0c',
          ink: '#18181b',
          gray: GRAY,
        },
        // Adaptive ink surfaces (CSS-var driven light/dark) — neutral grays.
        ink: {
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          850: 'rgb(var(--ink-850) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          750: 'rgb(var(--ink-750) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
          400: 'rgb(var(--ink-400) / <alpha-value>)',
        },
        // Adaptive foreground text (readable in both light & dark — see index.css).
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-strong': 'rgb(var(--fg-strong) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        // Category colours reduced to red/black/gray (no green/purple/amber).
        productive: GRAY[900],
        unproductive: RED[600],
        personal: GRAY[500],
        neutral: GRAY[400],
        // Tool neutral tokens → black / white / gray.
        mkink: '#000000',
        'mkink-soft': GRAY[700],
        muted: GRAY[500],
        'muted-soft': GRAY[400],
        line: GRAY[200],
        'line-soft': GRAY[100],
        surface: '#ffffff',
        'surface-alt': GRAY[50],
        tfink: { 900: GRAY[900], 500: GRAY[500], 200: GRAY[200] },
        // ── Kill all non-red chroma: every stray family resolves to RED ────
        green: RED, emerald: RED, teal: RED, lime: RED, cyan: RED, sky: RED,
        blue: RED, indigo: RED, violet: RED, purple: RED, fuchsia: RED,
        pink: RED, rose: RED, amber: RED, yellow: RED, orange: RED,
        // One true-gray family (no blue-tinted slate) for all neutrals.
        slate: GRAY, gray: GRAY, zinc: GRAY, stone: GRAY,
      },
      fontFamily: {
        // One typeface across the whole app for a single cohesive look.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        meeting: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(249,59,72,0.4), 0 8px 30px -6px rgba(249,59,72,0.45)',
        'card-hover': '0 6px 20px rgba(0, 0, 0, 0.08)',
        modal: '0 4px 12px rgba(15, 15, 15, 0.10), 0 18px 48px rgba(15, 15, 15, 0.20)',
        control: '0 1px 2px rgba(15, 15, 15, 0.05), 0 2px 6px rgba(15, 15, 15, 0.05)',
        'control-hover': '0 2px 4px rgba(15, 15, 15, 0.07), 0 6px 14px rgba(15, 15, 15, 0.09)',
        red: '0 4px 14px rgba(220, 38, 38, 0.25)',
        'red-strong': '0 6px 20px rgba(220, 38, 38, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #f93b48 0%, #c11420 100%)',
        'auth-radial':
          'radial-gradient(120% 120% at 0% 0%, #20121a 0%, #0b0e16 45%, #070910 100%)',
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'slide-in': 'slide-in 0.3s ease-out both',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
