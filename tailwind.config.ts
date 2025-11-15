import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: {
          DEFAULT: '#16a34a',
          foreground: '#f0fdf4'
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#fffbeb'
        },
        danger: {
          DEFAULT: '#dc2626',
          foreground: '#fef2f2'
        }
      },
      boxShadow: {
        card: '0 20px 50px -20px rgba(15, 23, 42, 0.35)'
      }
    }
  },
  plugins: []
}

export default config

