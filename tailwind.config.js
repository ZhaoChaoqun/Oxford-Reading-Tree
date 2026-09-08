/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#F97316',
        secondary: '#FDE68A',
        accent: '#38BDF8',
      },
      borderRadius: {
        xl: '0.75rem',
      },
      fontFamily: {
        sans: [
          'Avenir Next',
          'Avenir',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};