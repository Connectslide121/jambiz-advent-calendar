/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        'bg-deep': 'var(--color-bg-deep)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        border: 'var(--color-border)',
        'accent-red': 'var(--color-accent-red)',
        'accent-green': 'var(--color-accent-green)',
        gold: 'var(--color-gold)',
        ember: 'var(--color-ember)',
        frost: 'var(--color-frost)',
        aurora: 'var(--color-aurora)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
