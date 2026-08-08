/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./orders.html", "./products.html", "./customers.html", "./analytics.html", "./assets/js/app.js", "./assets/js/pages.js"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Vazirmatn FD", "Tahoma", "sans-serif"],
      },
      colors: {
        // Design token palette — inspired by Stripe / Linear / Polaris
        ink: {
          950: "#070b12",
          900: "#0b111d",
          850: "#0e1626",
          800: "#131c2e",
          700: "#1a2438",
          600: "#243149",
        },
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        aqua: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
        },
        amberx: "#f59e0b",
        rose: "#fb7185",
      },
      boxShadow: {
        glow: "0 0 24px -6px rgba(16, 185, 129, 0.45)",
        "glow-lg": "0 0 60px -12px rgba(16, 185, 129, 0.35)",
        card: "0 8px 30px -12px rgba(2, 8, 20, 0.7)",
        lift: "0 20px 45px -15px rgba(2, 8, 20, 0.85)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,.5)" },
          "70%": { boxShadow: "0 0 0 10px rgba(16,185,129,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
        "marquee-x": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.22,1,.36,1) both",
        "fade-in": "fade-in .8s ease both",
        "scale-in": "scale-in .6s cubic-bezier(.22,1,.36,1) both",
        "slide-right": "slide-right .7s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(.4,0,.6,1) infinite",
        floaty: "floaty 5s ease-in-out infinite",
        "spin-slow": "spin-slow 14s linear infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.22,1,.36,1)",
      },
    },
  },
  plugins: [],
};
