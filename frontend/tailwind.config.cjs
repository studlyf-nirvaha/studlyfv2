/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        syne: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
