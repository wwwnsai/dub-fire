/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#FB8603',
          dark: '#1c7ed6',
        },
        secondary: {
          light: '#BB2234',
        },
        background: {
          light: '#FAF7F8',
          dark: '#0f172a',
        },
        text: {
          light: '#000000',
          primary: '#0A0F23',
          secondary: '#5a5a5a',
          dark: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};
