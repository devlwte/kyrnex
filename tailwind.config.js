/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        kyrn: {
          bg: "#0a0e17",
          sidebar: "#0d131f",
          card: "#111827",
          cardHover: "#162033",
          cardActive: "#152238",
          input: "#090d16",
          border: "#1d293d",
          borderLight: "#283852",
          blue: "#2563eb",
          blueLight: "#3b82f6",
          blueBright: "#60a5fa",
          emerald: "#10b981",
          red: "#ef4444",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 20px -3px rgba(37, 99, 235, 0.35)",
        cardGlow: "0 0 15px -2px rgba(37, 99, 235, 0.25)",
        emeraldGlow: "0 0 15px -2px rgba(16, 185, 129, 0.3)",
      },
    },
  },
  plugins: [],
};
