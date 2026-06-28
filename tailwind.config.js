/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0A0E1A', // deep navy
        darkSurface: '#111827', // surface gray-900
        darkBorder: '#1F2937', // border gray-800
        textPrimary: '#F9FAFB', // text gray-50
        textMuted: '#6B7280', // text gray-500
        accentBlue: '#3B82F6', // blue-500
        statusSuccess: '#10B981', // green-500
        statusDanger: '#EF4444', // red-500
        statusWarning: '#F59E0B', // amber-500
      },
    },
  },
  plugins: [],
}
