// One-off export: transpiles src/data/*.ts (type-only imports, no runtime deps
// on each other) to plain JS with esbuild and dumps their exports as JSON
// fixtures for the Django seed command (backend/apps/catalog/management/
// commands/seed_storefront.py). Re-run this whenever src/data/*.ts changes
// so the backend fixture stays byte-for-byte the same data as the frontend.
import { transform } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const fixturesDir = path.join(rootDir, "backend", "fixtures");

const sources = [
  { file: "src/data/categories.ts", exportName: "categories", outFile: "categories.json" },
  { file: "src/data/products.ts", exportName: "products", outFile: "products.json" },
  { file: "src/data/blog.ts", exportName: "blogPosts", outFile: "blog.json" },
  { file: "src/data/catalog.ts", exportName: "catalog", outFile: "catalog.json" },
  { file: "src/data/siteSettings.ts", exportName: "siteSettings", outFile: "siteSettings.json" },
];

async function loadExport(relPath, exportName) {
  const absPath = path.join(rootDir, relPath);
  const source = await readFile(absPath, "utf-8");
  const { code } = await transform(source, { loader: "ts", format: "esm" });
  const tmpFile = path.join(tmpdir(), `vybe-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(tmpFile, code, "utf-8");
  const mod = await import(pathToFileURL(tmpFile).href);
  return mod[exportName];
}

await mkdir(fixturesDir, { recursive: true });

for (const { file, exportName, outFile } of sources) {
  const data = await loadExport(file, exportName);
  const outPath = path.join(fixturesDir, outFile);
  await writeFile(outPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`wrote ${outFile} (${Array.isArray(data) ? data.length + " items" : "object"})`);
}
