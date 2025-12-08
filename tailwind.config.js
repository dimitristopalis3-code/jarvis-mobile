/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyan: {
          DEFAULT: '#00E5FF',
          dim: 'rgba(0, 229, 255, 0.2)',
          glow: 'rgba(0, 229, 255, 0.6)'
        },
        black: {
          DEFAULT: '#000000',
          rich: '#05080c'
        },
        alert: '#FF0000'
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 10s linear infinite',
        'scan': 'scan 3s linear infinite',
        'slide-up': 'slideUp 0.3s ease-out forwards', // <--- Add this
      },
      keyframes: {
        scan: {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
        slideUp: { // <--- Add this
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}