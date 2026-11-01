/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#2A3B66',
        },
        brand: {
          blue: '#2563EB',
          subtle: '#3B82F6',
          light: '#EFF6FF',
          dark: '#1E40AF',
        }
      }
    },
  },
  plugins: [],
}
