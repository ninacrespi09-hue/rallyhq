/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-jakarta)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
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
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(13, 23, 48, 0.04), 0 8px 24px -12px rgba(13, 23, 48, 0.16)",
        lift: "0 2px 6px rgba(13, 23, 48, 0.06), 0 18px 40px -18px rgba(13, 23, 48, 0.30)",
        glow: "0 12px 34px -12px rgba(37, 99, 235, 0.50)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      keyframes: {
        "pop-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.35s ease both",
        rise: "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
