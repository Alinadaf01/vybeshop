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
      },
      animation: {
        shimmer: "shimmer 1.4s linear infinite",
        spin: "spin 600ms linear infinite",
      },
    },
  },
  plugins: [],
};
