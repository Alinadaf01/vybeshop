// Guards against FIX-TASK.md bug #1: src/components/ui/Image.tsx always
// requests {base}-400.webp, {base}-800.webp and {base}-1200.webp in its
// srcset, regardless of the source photo's native size — so every .jpg
// under public/images must have all three sibling .webp files on disk, or
// the browser 404s that <source> candidate and the whole <picture> falls
// back to the placeholder. Widths here must stay in sync with Image.tsx's
// DEFAULT_WIDTHS.
//
// public/images/og/* is excluded — those are fixed-size Open Graph meta
// images, never rendered through <Image>, so they never get srcset variants.
import { readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const WIDTHS = [400, 800, 1200];
const ROOT = path.resolve("public/images");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "og") continue;
      walk(full, out);
    } else if (entry.toLowerCase().endsWith(".jpg")) {
      out.push(full);
    }
  }
  return out;
}

const jpgs = walk(ROOT);
const missing = [];

for (const jpg of jpgs) {
  const base = jpg.slice(0, -".jpg".length);
  for (const w of WIDTHS) {
    const webp = `${base}-${w}.webp`;
    if (!existsSync(webp)) missing.push(path.relative(process.cwd(), webp));
  }
}

if (missing.length === 0) {
  console.log(`✅ همه ${jpgs.length} فایل .jpg زیر public/images هر سه نسخه‌ی webp (${WIDTHS.join("/")}) را دارند.`);
  process.exit(0);
}

console.log(`❌ ${missing.length} فایل webp موجود نیست (اجرای python scripts/process-content-photos.py لازم است):\n`);
for (const m of missing) console.log(`  ${m}`);
process.exitCode = 1;
