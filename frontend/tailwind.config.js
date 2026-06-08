/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand red ─────────────────────────────────────────────────────
        // Shell uses the numeric 50–950 scale; the merged tools add named keys
        // (Reasons Eliminator, Meeting, Time Finder). Numeric + named keys
        // coexist on one object, so every existing class keeps working.
        brand: {
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
          // Time Finder
          DEFAULT: '#E24B4A',
          dark: '#C13D3C',
          soft: '#FCEBEB',
          // Reasons Eliminator + Meeting (near-identical reds — unified)
          red: '#E11D2A',
          'red-light': '#EF4444',
          'red-dark': '#B8141F',
          'red-soft': '#FDECEE',
          'red-tint': '#FEF2F2',
          black: '#0B0B0C',
          ink: '#1A1A1D',
          gray: {
            50: '#F7F7F8',
            100: '#EFEFF1',
            200: '#E4E4E7',
            300: '#D1D1D6',
            400: '#A1A1AA',
            500: '#71717A',
            600: '#52525B',
            700: '#3F3F46',
            800: '#27272A',
            900: '#18181B',
          },
        },
        // ── Shell "ink" surfaces (CSS-var driven dark/light) — untouched ───
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
        // Shell category colors.
        productive: '#22c55e',
        unproductive: '#ef4444',
        personal: '#8b5cf6',
        neutral: '#f59e0b',
        // ── Meeting Success Maximizer light-theme tokens ──────────────────
        // ("ink" is namespaced to "mkink" to avoid clashing with the shell.)
        mkink: '#000000',
        'mkink-soft': '#374151',
        muted: '#6B7280',
        'muted-soft': '#9CA3AF',
        line: '#E5E7EB',
        'line-soft': '#F3F4F6',
        surface: '#FFFFFF',
        'surface-alt': '#F9FAFB',
        // ── Time Finder ink (namespaced) ──────────────────────────────────
        tfink: {
          900: '#0d0d0d',
          500: '#737373',
          200: '#e5e5e5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        meeting: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(249,59,72,0.4), 0 8px 30px -6px rgba(249,59,72,0.45)',
        // Merged tool shadows (light-theme depth).
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
