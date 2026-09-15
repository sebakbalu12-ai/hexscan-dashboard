/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        ink: {
          950: '#07080a',
          900: '#0a0b0d',
          850: '#0d0e11',
          800: '#111317',
          700: '#171a1f',
          600: '#1e2229',
        },
        // Text
        mist: {
          100: '#e9ebee',
          200: '#c7cbd1',
          300: '#9aa0a6',
          400: '#767c83',
          500: '#5a6068',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.11)',
        },
        // Accents
        accent: {
          DEFAULT: '#2563eb',
          soft: '#3b82f6',
          deep: '#1d4ed8',
        },
        positive: '#22c55e',
        negative: '#ef4444',
        warn: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 rgba(255,255,255,0.03), 0 24px 48px -32px rgba(0,0,0,0.95)',
        glow: '0 0 0 1px rgba(37,99,235,0.45), 0 0 28px -6px rgba(37,99,235,0.55)',
        'glow-red': '0 0 0 1px rgba(239,68,68,0.4), 0 0 30px -8px rgba(239,68,68,0.5)',
        pop: '0 18px 50px -18px rgba(0,0,0,0.95)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-110%)' },
          '100%': { transform: 'translateY(520%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'pop-in': 'pop-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-up': 'slide-up 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'scan-line': 'scan-line 3.2s linear infinite',
      },
    },
  },
  plugins: [],
};
