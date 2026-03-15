/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { 50: "#EBF5FF", 100: "#D6EBFF", 500: "#2E75B6", 600: "#1B5E9E", 700: "#1B4F72", 800: "#143D5C" },
      },
    },
  },
  plugins: [],
};
