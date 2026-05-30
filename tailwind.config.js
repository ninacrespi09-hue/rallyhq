/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand scale = blue
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Deep navy for surfaces, headings, and the sidebar
        navy: {
          50: "#eef2f9",
          100: "#d8e1f0",
          200: "#b3c4e0",
          300: "#7f9ac9",
          400: "#4f6ba8",
          500: "#2f4a86",
          600: "#23396b",
          700: "#1b2c54",
          800: "#142141",
          900: "#0d1730",
          950: "#070d1d",
        },
        ink: {
          800: "#142141",
          900: "#0d1730",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(13, 23, 48, 0.04), 0 6px 20px -8px rgba(13, 23, 48, 0.12)",
        glow: "0 10px 30px -10px rgba(37, 99, 235, 0.45)",
      },
    },
  },
  plugins: [],
};
