// Runs after build:ssr, before prerender — writes dist/sitemap.xml from the
// same listAllRoutes() the prerender script uses, so the two never drift.
import { writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE_URL = (process.env.VITE_SITE_URL ?? "https://vybe.ir").replace(/\/$/, "");

async function main() {
  const { listAllRoutes } = await import(pathToFileURL(path.join(ROOT, "dist-ssr", "entry-server.js")));
  const routes = listAllRoutes();
  const today = new Date().toISOString().slice(0, 10);

  const urls = routes
    .map((route) => `  <url>\n    <loc>${SITE_URL}${route}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  writeFileSync(path.join(ROOT, "dist", "sitemap.xml"), xml, "utf-8");

  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  writeFileSync(path.join(ROOT, "dist", "robots.txt"), robotsTxt, "utf-8");

  console.log(`sitemap: wrote ${routes.length} URLs to dist/sitemap.xml and dist/robots.txt`);
}

main();
