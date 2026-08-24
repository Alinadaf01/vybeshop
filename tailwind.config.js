import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(
  readFileSync(path.resolve(__dirname, "./design/tokens.json"), "utf-8"),
);

function kebab(key) {
  return key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

const fontSize = Object.fromEntries(
  Object.entries(tokens.typeScale)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, scale]) => [
      kebab(key),
      [`var(--fs-${kebab(key)})`, { lineHeight: scale.lineHeight, letterSpacing: scale.letterSpacing }],
    ]),
);

// Keyed identically to fontSize so text-h4 pairs predictably with font-h4 —
// weight comes from typeScale.$weightNote (explicit per level), not font.role.
const typeScaleFontWeight = Object.fromEntries(
  Object.entries(tokens.typeScale)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key]) => [kebab(key), `var(--fw-${kebab(key)})`]),
);

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Default Tailwind color palette is intentionally not inherited.
    // Every color must resolve to a token from design/tokens.json — see src/styles/tokens.css.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "var(--color-white)",
      black: "var(--color-black)",
      graphite: "var(--color-graphite)",
      "fog-white": "var(--color-fog-white)",
      titanium: "var(--color-titanium)",
      silver: "var(--color-silver)",
      cyan: "var(--color-cyan)",
      ink: "var(--color-ink)",
      surface: "var(--color-surface)",
      edge: "var(--color-edge)",
      gray: {
        100: "var(--color-gray-100)",
        500: "var(--color-gray-500)",
        800: "var(--color-gray-800)",
      },
      danger: {
        DEFAULT: "var(--color-danger)",
        ink: "var(--color-danger-ink)",
        dark: "var(--color-danger-dark)",
      },
      success: {
        DEFAULT: "var(--color-success)",
        ink: "var(--color-success-ink)",
        dark: "var(--color-success-dark)",
      },
      warning: {
        DEFAULT: "var(--color-warning)",
        ink: "var(--color-warning-ink)",
        dark: "var(--color-warning-dark)",
      },
      info: "var(--color-info)",
      overlay: "var(--color-overlay)",
    },
    fontFamily: {
      peyda: ["var(--font-peyda)"],
      sora: ["var(--font-sora)"],
      inter: ["var(--font-inter)"],
      mono: ["var(--font-mono)"],
    },
    fontSize,
    borderRadius: {
      none: "0",
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      xl: "var(--radius-xl)",
      full: "var(--radius-full)",
    },
    transitionTimingFunction: {
      DEFAULT: "var(--ease)",
    },
    transitionDuration: {
      fast: "var(--dur-fast)",
      base: "var(--dur-base)",
      slow: "var(--dur-slow)",
    },
    screens: {
      sm: `${tokens.breakpoint.sm}px`,
      md: `${tokens.breakpoint.md}px`,
      lg: `${tokens.breakpoint.lg}px`,
      xl: `${tokens.breakpoint.xl}px`,
    },
    extend: {
      maxWidth: {
        text: `${tokens.layout.maxTextWidth}px`,
        page: `${tokens.layout.maxContentWidth}px`,
      },
      // Additive alongside Tailwind's default font-medium/semibold/bold/etc —
      // font-h4 etc. are for type-scale levels specifically, sourced from tokens.json.
      fontWeight: typeScaleFontWeight,
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "100% 0" },
          "100%": { backgroundPosition: "-100% 0" },
        },
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        // FIX-TASK.md §2 — کارت ورود، برگرفته از design/otp-template/
        // (رنگ‌ها با برند جایگزین شدند، ولی خود حرکت‌ها همان‌هاست).
        "card-enter": {
          from: { opacity: "0", transform: "translateY(24px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%": { transform: "translateX(-10px)" },
          "30%": { transform: "translateX(10px)" },
          "45%": { transform: "translateX(-8px)" },
          "60%": { transform: "translateX(8px)" },
          "75%": { transform: "translateX(-4px)" },
          "90%": { transform: "translateX(4px)" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(0 209 255 / 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgb(0 209 255 / 0)" },
        },
        "success-pop": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "70%": { transform: "scale(1.08)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "success-ring": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "0", transform: "scale(1.15)" },
        },
        "mesh-shift": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.8" },
        },
        "orb-float-1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(24px, -32px) scale(1.06)" },
          "66%": { transform: "translate(-16px, 16px) scale(0.96)" },
        },
        "orb-float-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-28px, 28px) scale(1.1)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        spin: "spin 600ms linear infinite",
        "card-enter": "card-enter 700ms cubic-bezier(0.22,1,0.36,1) forwards",
        shake: "shake 550ms cubic-bezier(0.36,0.07,0.19,0.97) both",
        "pulse-ring": "pulse-ring 2.5s cubic-bezier(0.4,0,0.2,1) infinite",
        "success-pop": "success-pop 550ms cubic-bezier(0.22,1,0.36,1) forwards",
        "success-ring": "success-ring 700ms cubic-bezier(0.4,0,0.2,1) forwards",
        "mesh-shift": "mesh-shift 14s cubic-bezier(0.4,0,0.2,1) infinite",
        "orb-float-1": "orb-float-1 18s cubic-bezier(0.4,0,0.2,1) infinite",
        "orb-float-2": "orb-float-2 22s cubic-bezier(0.4,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};
