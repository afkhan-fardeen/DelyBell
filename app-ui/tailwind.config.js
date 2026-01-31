/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#008060', // Shopify Polaris Green
        'background-light': '#f6f6f7',
        'background-dark': '#1a1a1a',
        'surface-light': '#ffffff',
        'surface-dark': '#2a2a2a',
        'border-light': '#e1e3e5',
        'border-dark': '#3e3e3e',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
};
