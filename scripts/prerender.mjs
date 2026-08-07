// Runs after `vite build` (client) and `vite build --ssr src/entry-server.tsx`.
// For every route in listAllRoutes(): injects real <title>/meta/OG/JSON-LD into
// a copy of dist/index.html so link-preview bots (Telegram, Instagram, etc.)
// that don't execute JS still see correct metadata. For the 4 fully-static
// routes (about/contact/catalog/categories) it also swaps in prerendered body
// markup; every other route keeps the plain CSR shell (see design/HANDOFF.md
// and the F6 render-decision discussion for why only those 4 get body prerender).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");
// Must match the fallback in src/lib/seo.ts — set VITE_SITE_URL before
// building (client build reads it via import.meta.env, this script via
// process.env) if it ever needs to differ from the production domain.
const SITE_URL = (process.env.VITE_SITE_URL ?? "https://vybeshop.ir").replace(/\/$/, "");

function escapeJsonForScriptTag(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildHead(head) {
  const fullTitle = head.titleIsRaw || head.title === "VYBE" ? head.title : `${head.title} · VYBE`;
  const url = `${SITE_URL}${head.path}`;
  const imageUrl = head.image.startsWith("http") ? head.image : `${SITE_URL}${head.image}`;

  const tags = [
    `<meta name="description" content="${escapeAttr(head.description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="${head.type}">`,
    `<meta property="og:site_name" content="VYBE">`,
    `<meta property="og:title" content="${escapeAttr(fullTitle)}">`,
    `<meta property="og:description" content="${escapeAttr(head.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${imageUrl}">`,
    `<meta property="og:locale" content="fa_IR">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeAttr(fullTitle)}">`,
    `<meta name="twitter:description" content="${escapeAttr(head.description)}">`,
    `<meta name="twitter:image" content="${imageUrl}">`,
  ];
  if (head.jsonLd) {
    tags.push(`<script type="application/ld+json">${escapeJsonForScriptTag(head.jsonLd)}</script>`);
  }
  return { title: fullTitle, tagsHtml: tags.join("\n    ") };
}

function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function outputPathFor(routePath) {
  if (routePath === "/") return path.join(DIST_DIR, "index.html");
  return path.join(DIST_DIR, routePath.replace(/^\//, ""), "index.html");
}

async function main() {
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const { renderRoute, listAllRoutes } = await import(pathToFileURL(path.join(ROOT, "dist-ssr", "entry-server.js")));

  const routes = listAllRoutes();
  let staticBodyCount = 0;
  let headOnlyCount = 0;
  let skipped = 0;

  for (const routePath of routes) {
    const { head, body } = await renderRoute(routePath);
    if (!head) {
      skipped++;
      continue;
    }

    const { title, tagsHtml } = buildHead(head);
    let html = template.replace(/<title>.*?<\/title>/, `<title>${escapeAttr(title)}</title>`);
    html = html.replace("</head>", `    ${tagsHtml}\n  </head>`);
    if (body) {
      html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
      staticBodyCount++;
    } else {
      headOnlyCount++;
    }

    const outPath = outputPathFor(routePath);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf-8");
  }

  console.log(
    `prerender: ${staticBodyCount} full-body pages, ${headOnlyCount} head-only shells, ${skipped} skipped (of ${routes.length} routes)`,
  );
}

main();
