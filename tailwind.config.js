/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'accent-red': 'var(--color-accent-red)',
        'accent-green': 'var(--color-accent-green)',
        gold: 'var(--color-gold)',
        text: 'var(--color-text)',
      },
    },
  },
  plugins: [],
};
