/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020b18',
          900: '#0a0f1e',
          800: '#0d1526',
          700: '#111827',
          600: '#1a2236',
          500: '#1f2d44',
        },
        surface: {
          DEFAULT: '#111827',
          card: '#1a2236',
          hover: '#1f2d44',
        },
        risk: {
          low: '#10b981',
          medium: '#f59e0b',
          high: '#f97316',
          critical: '#ef4444',
        },
        accent: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          muted: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
