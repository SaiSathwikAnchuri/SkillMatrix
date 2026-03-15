/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        teal: { DEFAULT: '#0D7C8E', light: '#E0F5F8', mid: '#13A2B8', xlight: '#F0FAFB' },
        navy: { DEFAULT: '#0C2340', mid: '#1A3A5C', light: '#D6E4EF' },
        accent: { DEFAULT: '#F4622A', light: '#FEF0EA' },
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 4s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
