/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Karam Premium — Primary #004D40 */
        primary: {
          50: '#e8f5f2',
          100: '#d1ebe5',
          200: '#a3d7cb',
          300: '#6fb9a8',
          400: '#3d9a85',
          500: '#1a7a66',
          600: '#004D40',
          700: '#003d33',
          800: '#002e27',
          900: '#001f1a',
        },
        /* Secondary accent #FFD600 */
        secondary: {
          50: '#fffceb',
          100: '#fff8c2',
          200: '#fff085',
          300: '#ffe640',
          400: '#ffd600',
          500: '#ecc400',
          600: '#c9a000',
          700: '#a17a00',
          800: '#855f07',
          900: '#714e0c',
        },
        /* Tertiary surface #F9F8F6 */
        tertiary: {
          50: '#FDFCFB',
          100: '#F9F8F6',
          200: '#F0EEE9',
          300: '#E5E2DB',
        },
        /* Neutral ink #1A1A1A */
        ink: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#CCCCCC',
          300: '#A3A3A3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#2A2A2A',
          800: '#1A1A1A',
          900: '#0D0D0D',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
        display: ['Cairo', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pill: '0 8px 24px rgba(0, 77, 64, 0.22)',
      },
    },
  },
  plugins: [],
};
