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
        gold: {
          300: '#F0D080',
          400: '#C9A84C',
          500: '#A8882A',
          600: '#7D6418',
        },
      },
    },
  },
  plugins: [],
}
