/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', panel: 'var(--panel)', ink: 'var(--ink)', muted: 'var(--muted)', line: 'var(--line)',
        field: 'var(--field)', accent: 'var(--accent)', danger: 'var(--danger)',
        best: 'var(--best)', safe: 'var(--safe)', stretch: 'var(--stretch)', excluded: 'var(--excluded)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
