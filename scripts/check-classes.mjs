// Extracts every class="..." from a design HTML file and reports which ones
// don't resolve against the project's actual tailwind.config.js — Design
// builds its mockups against Tailwind's default CDN scale, Code replaces
// (not extends) that scale with tokens.json's, so a raw copy-paste silently
// drops styling. Run before converting any design/*.html page to React.
//
// Usage: npm run check:classes -- design/05-product-detail.html
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run check:classes -- <path-to-html>");
    process.exit(1);
  }

  const filePath = path.resolve(file);
  const html = readFileSync(filePath, "utf-8");

  const classes = new Set();
  const attrRegex = /class(?:Name)?=["']([^"']+)["']/g;
  let match;
  while ((match = attrRegex.exec(html))) {
    for (const cls of match[1].split(/\s+/).filter(Boolean)) classes.add(cls);
  }

  if (classes.size === 0) {
    console.log(`هیچ class در ${file} پیدا نشد.`);
    return;
  }

  const configPath = path.resolve("tailwind.config.js");
  const { default: userConfig } = await import(pathToFileURL(configPath).href);

  // Feed Tailwind the real file so its own extractor (which handles arbitrary
  // values, variants, etc. correctly) decides what's a candidate utility —
  // we only need to know which of those candidates actually produced a rule.
  const config = { ...userConfig, content: [{ raw: html, extension: "html" }] };

  const result = await postcss([tailwindcss(config)]).process("@tailwind utilities;", {
    from: undefined,
  });
  const css = result.css;

  function escapeClass(cls) {
    return cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  }

  function isEmitted(cls) {
    const needle = `.${escapeClass(cls)}`;
    let index = 0;
    while ((index = css.indexOf(needle, index)) !== -1) {
      const nextChar = css[index + needle.length];
      if (!nextChar || !/[a-zA-Z0-9_\\-]/.test(nextChar)) return true;
      index += 1;
    }
    return false;
  }

  const unresolved = [...classes].filter((cls) => !isEmitted(cls)).sort();

  if (unresolved.length === 0) {
    console.log(`✅ همه ${classes.size} کلاس در ${path.basename(file)} با تنظیمات Tailwind پروژه resolve می‌شوند.`);
    return;
  }

  console.log(`❌ ${unresolved.length} از ${classes.size} کلاس در ${path.basename(file)} resolve نمی‌شوند:\n`);
  for (const cls of unresolved) console.log(`  ${cls}`);
  console.log("\nنقشه معادل‌های شناخته‌شده در design/HANDOFF.md آمده — بقیه را دستی بررسی کن.");
  process.exitCode = 1;
}

main();
