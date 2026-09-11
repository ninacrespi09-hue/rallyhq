/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Verdana", "Geneva", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        brand: {
          50: "#f3f8ff",
          100: "#e4efff",
          200: "#cbe0fe",
          300: "#a8c9fd",
          400: "#7ab0fb",
          500: "#5493f7",
          600: "#3b82f6",
          700: "#2563eb",
          800: "#1d4ed8",
          900: "#1e40af",
        },
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
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "4xl": "0.75rem",
        "5xl": "0.875rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(13, 23, 48, 0.04), 0 8px 24px -12px rgba(13, 23, 48, 0.16)",
        lift: "0 2px 6px rgba(13, 23, 48, 0.06), 0 18px 40px -18px rgba(13, 23, 48, 0.30)",
        glow: "0 12px 34px -12px rgba(59, 130, 246, 0.45)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
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
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pop-in": "pop-in 0.35s ease both",
        rise: "rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
