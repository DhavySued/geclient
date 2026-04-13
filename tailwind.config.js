/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primária — azul institucional
        primary: {
          50:  '#e6edf7',
          100: '#bfcfe8',
          200: '#8aadd7',
          300: '#5589c5',
          400: '#2a6eb6',
          500: '#00236a',   // ← cor principal
          600: '#001d5a',
          700: '#00174a',
          800: '#00103a',
          900: '#000a28',
          950: '#00061a',
        },
        // Secundária — laranja
        brand: {
          50:  '#fff4e6',
          100: '#ffe0b2',
          200: '#ffcc7a',
          300: '#ffb347',
          400: '#f39200',   // ← cor secundária (acento)
          500: '#d97d00',
          600: '#b86700',
          700: '#925200',
          800: '#6d3d00',
          900: '#4a2900',
          950: '#2d1800',
        },
        // Mantém gold para LevelBadge Premium
        gold: {
          300: '#F0D080',
          400: '#C9A84C',
          500: '#A8882A',
        },
      },
    },
  },
  plugins: [],
}
