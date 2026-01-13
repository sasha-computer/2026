/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        japan: {
          red: '#dc2626',
          cream: '#fef3c7',
          ink: '#1f2937',
        },
        gray: {
          750: '#2d3748', // Between gray-700 (#374151) and gray-800 (#1f2937)
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
