// Regenerates src/styles/tokens.css from design/tokens.json.
// Do not hand-edit the output — rerun this script instead (see design/HANDOFF.md).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.resolve(__dirname, "../design/tokens.json");
const OUTPUT_PATH = path.resolve(__dirname, "../src/styles/tokens.css");

function resolveRefs(value, tokens) {
  if (typeof value !== "string") return value;
  const match = value.match(/^\{(.+)\}$/);
  if (!match) return value;
  const node = match[1].split(".").reduce((acc, key) => acc?.[key], tokens);
  if (node == null) {
    throw new Error(`Unresolved token reference: ${value}`);
  }
  return typeof node === "object" && "value" in node ? node.value : node;
}

function kebab(key) {
  return key.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

// gray100/gray500/gray800 are the only keys needing a letter/digit split —
// h1..h4 must stay glued, so this isn't handled generically in kebab().
const NEUTRAL_KEY_OVERRIDES = { gray100: "gray-100", gray500: "gray-500", gray800: "gray-800" };

// Tailwind's bg-x/50 opacity modifier can't decompose a var() color reference,
// so overlay scrims need their alpha baked into the value itself.
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function main() {
  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  const lines = [];

  lines.push("/*");
  lines.push(" * GENERATED FILE — do not hand-edit.");
  lines.push(` * Source: design/tokens.json (v${tokens.$meta.version})`);
  lines.push(" * Regenerate with: npm run tokens:build");
  lines.push(" */");
  lines.push("");
  lines.push(":root {");

  lines.push("  /* color.brand */");
  for (const [key, node] of Object.entries(tokens.color.brand)) {
    lines.push(`  --color-${kebab(key)}: ${node.value};`);
  }

  lines.push("");
  lines.push("  /* color.neutral */");
  for (const [key, value] of Object.entries(tokens.color.neutral)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --color-${NEUTRAL_KEY_OVERRIDES[key] ?? kebab(key)}: ${value};`);
  }

  lines.push("");
  lines.push(
    "  /* extra dark-surface tokens used in design HTML but not yet formalized in tokens.json — flagged in design/NOTES.md */",
  );
  lines.push("  --color-ink: #1A1A1C;");
  lines.push("  --color-surface: #141416;");
  lines.push("  --color-edge: #26262A;");
  lines.push(
    "  /* overlay scrim — gray800 with alpha baked in, since bg-x/50 can't apply to a var() color */",
  );
  lines.push(`  --color-overlay: ${hexToRgba(tokens.color.neutral.gray800, 0.6)};`);

  lines.push("");
  lines.push("  /* color.status */");
  for (const [key, value] of Object.entries(tokens.color.status)) {
    if (key.startsWith("$") || typeof value !== "string") continue;
    lines.push(`  --color-${kebab(key)}: ${value};`);
  }
  for (const [key, node] of Object.entries(tokens.color.status.onLight)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --color-${kebab(key)}: ${node.value};`);
  }
  for (const [key, node] of Object.entries(tokens.color.status.onDark)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --color-${kebab(key)}: ${node.value};`);
  }

  lines.push("");
  lines.push("  /* color.semantic (references resolved against color.brand/neutral) */");
  for (const [key, value] of Object.entries(tokens.color.semantic)) {
    if (key.startsWith("$")) continue;
    const resolved = resolveRefs(value, tokens);
    lines.push(`  --semantic-${kebab(key)}: ${resolved};`);
  }

  lines.push("");
  lines.push("  /* font.family */");
  for (const [key, value] of Object.entries(tokens.font.family)) {
    lines.push(`  --font-${kebab(key)}: ${value};`);
  }

  lines.push("");
  lines.push("  /* typeScale — mobile values (desktop override below) */");
  for (const [key, scale] of Object.entries(tokens.typeScale)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --fs-${kebab(key)}: ${scale.mobile}px;`);
    lines.push(`  --lh-${kebab(key)}: ${scale.lineHeight};`);
    lines.push(`  --ls-${kebab(key)}: ${scale.letterSpacing};`);
  }

  lines.push("");
  lines.push("  /* space */");
  for (const [key, value] of Object.entries(tokens.space)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --space-${key}: ${value}px;`);
  }

  lines.push("");
  lines.push("  /* layout */");
  lines.push(`  --layout-max-text-width: ${tokens.layout.maxTextWidth}px;`);
  lines.push(`  --layout-max-content-width: ${tokens.layout.maxContentWidth}px;`);
  lines.push(`  --layout-gutter: ${tokens.layout.gutter.mobile}px;`);
  lines.push(`  --layout-paragraph-gap: ${tokens.layout.paragraphGap}px;`);
  lines.push(`  --layout-section-gap: ${tokens.layout.sectionGap.mobile}px;`);
  lines.push(`  --layout-icon-text-gap: ${tokens.layout.iconTextGap}px;`);
  lines.push(`  --layout-header-height: ${tokens.layout.headerHeight}px;`);

  lines.push("");
  lines.push("  /* radius */");
  for (const [key, value] of Object.entries(tokens.radius)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --radius-${kebab(key)}: ${typeof value === "number" ? `${value}px` : value};`);
  }

  lines.push("");
  lines.push("  /* border */");
  for (const [key, value] of Object.entries(tokens.border)) {
    if (key.startsWith("$")) continue;
    lines.push(`  --border-${kebab(key)}: ${value}px;`);
  }

  lines.push("");
  lines.push("  /* motion */");
  lines.push(`  --ease: ${tokens.motion.ease};`);
  for (const [key, value] of Object.entries(tokens.motion.duration)) {
    lines.push(`  --dur-${kebab(key)}: ${value}ms;`);
  }

  lines.push("}");
  lines.push("");
  lines.push(`@media (min-width: ${tokens.breakpoint.md}px) {`);
  lines.push("  :root {");
  lines.push("    /* typeScale — desktop overrides */");
  for (const [key, scale] of Object.entries(tokens.typeScale)) {
    if (key.startsWith("$")) continue;
    if (scale.desktop !== scale.mobile) {
      lines.push(`    --fs-${kebab(key)}: ${scale.desktop}px;`);
    }
  }
  lines.push(`    --layout-gutter: ${tokens.layout.gutter.desktop}px;`);
  lines.push(`    --layout-section-gap: ${tokens.layout.sectionGap.desktop}px;`);
  lines.push("  }");
  lines.push("}");
  lines.push("");

  writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf-8");
  console.log(`tokens.css generated from tokens.json v${tokens.$meta.version}`);
}

main();
