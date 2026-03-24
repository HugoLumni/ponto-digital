/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#A24F3B',
          dark: '#8a3f2e',
          light: '#c4705a',
        },
        forest: {
          DEFAULT: '#77994C',
          dark: '#5e7a3a',
          light: '#96b86a',
        },
        sand: {
          DEFAULT: '#F2DC91',
          dark: '#e8cc6a',
          light: '#f7ecb8',
        },
        surface: {
          DEFAULT: '#FAF8F4',
          card: '#FFFFFF',
          elevated: '#F0EBE3',
          border: '#E8DDD2',
        },
        ink: {
          DEFAULT: '#2C1F1A',
          muted: '#7A6255',
          subtle: '#B5A090',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(162, 79, 59, 0.08)',
        card: '0 1px 4px rgba(44, 31, 26, 0.06), 0 4px 16px rgba(44, 31, 26, 0.06)',
        brand: '0 4px 24px rgba(162, 79, 59, 0.25)',
      },
    },
  },
  plugins: [],
}
