/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F2F6',
          100: '#CCE4EE',
          200: '#99C9DC',
          300: '#5FA9C6',
          400: '#2A87AB',
          500: '#00719F',
          600: '#00628B',
          DEFAULT: '#00628B',
          700: '#004F70',
          800: '#003B53',
          900: '#002838',
        },
        ink: '#14232B',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 12px 32px -12px rgba(0, 59, 83, 0.28)',
      },
      keyframes: {
        'toast-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'modal-in': { from: { opacity: '0', transform: 'scale(.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'toast-in': 'toast-in .2s ease-out',
        'modal-in': 'modal-in .18s ease-out',
      },
    },
  },
  plugins: [],
};
