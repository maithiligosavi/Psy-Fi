/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stormyTeal:    '#006d77',
        pearlAqua:     '#83c5be',
        aliceBlue:     '#edf6f9',
        almondSilk:    '#ffddd2',
        tangerineDream:'#e29578',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
