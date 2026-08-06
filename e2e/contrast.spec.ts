import { test, expect, type Page } from "@playwright/test";

// WCAG AA requires 4.5:1 for text at or below 16px (large/bold text gets a
// lower threshold, but design/tokens.json's $textNote pins body text to the
// stricter rule regardless of weight, so we check every ≤16px node against 4.5).
const MIN_CONTRAST = 4.5;
const MAX_FONT_SIZE_PX = 16;

interface ContrastFailure {
  selector: string;
  text: string;
  fontSize: number;
  color: string;
  background: string;
  ratio: number;
}

const pagesToCheck = [
  { path: "/dev/components", label: "/dev/components" },
  { path: "/products/vybe-stand-pro", label: "/products/:slug" },
  { path: "/products", label: "/products" },
  { path: "/categories", label: "/categories" },
  { path: "/catalog", label: "/catalog" },
  { path: "/blog", label: "/blog" },
  { path: "/blog/why-minimal-design-matters", label: "/blog/:slug" },
];

async function findContrastFailures(page: Page): Promise<ContrastFailure[]> {
  return page.evaluate(
    ({ minContrast, maxFontSize }) => {
      function parseColor(value: string): [number, number, number, number] | null {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1].split(",").map((n) => parseFloat(n.trim()));
        return [parts[0], parts[1], parts[2], parts[3] ?? 1];
      }

      function relativeLuminance([r, g, b]: number[]): number {
        const [rs, gs, bs] = [r, g, b].map((c) => {
          const channel = c / 255;
          return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function contrastRatio(a: number[], b: number[]): number {
        const l1 = relativeLuminance(a);
        const l2 = relativeLuminance(b);
        const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
        return (lighter + 0.05) / (darker + 0.05);
      }

      function effectiveBackground(el: Element): [number, number, number] {
        let node: Element | null = el;
        while (node) {
          const bg = parseColor(getComputedStyle(node).backgroundColor);
          if (bg && bg[3] > 0) return [bg[0], bg[1], bg[2]];
          node = node.parentElement;
        }
        return [255, 255, 255];
      }

      function hasOwnText(el: Element): boolean {
        return Array.from(el.childNodes).some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        );
      }

      // WCAG 1.4.3 exempts text that is part of an inactive UI component, and
      // aria-hidden content isn't exposed as text to begin with.
      function isExempt(el: Element): boolean {
        if ((el as HTMLButtonElement).disabled) return true;
        return !!el.closest('[disabled], [aria-disabled="true"], [aria-hidden="true"]');
      }

      function isVisible(el: Element): boolean {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function describe(el: Element): string {
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string" ? `.${el.className.split(" ")[0]}` : "";
        return `${el.tagName.toLowerCase()}${id}${cls}`;
      }

      const results: ContrastFailure[] = [];
      const skipTags = new Set(["SCRIPT", "STYLE", "OPTION"]);

      document.querySelectorAll("body *").forEach((el) => {
        if (skipTags.has(el.tagName)) return;
        if (!hasOwnText(el) || !isVisible(el)) return;
        if (isExempt(el)) return;

        const style = getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize > maxFontSize) return;

        const textColor = parseColor(style.color);
        if (!textColor) return;

        const background = effectiveBackground(el);
        const ratio = contrastRatio([textColor[0], textColor[1], textColor[2]], background);

        if (ratio < minContrast) {
          results.push({
            selector: describe(el),
            text: (el.textContent ?? "").trim().slice(0, 40),
            fontSize,
            color: style.color,
            background: `rgb(${background.join(", ")})`,
            ratio: Math.round(ratio * 100) / 100,
          });
        }
      });

      return results;
    },
    { minContrast: MIN_CONTRAST, maxFontSize: MAX_FONT_SIZE_PX },
  );
}

for (const { path, label } of pagesToCheck) {
  test(`no low-contrast text ≤16px on ${label}`, async ({ page }) => {
    await page.goto(path);
    const failures = await findContrastFailures(page);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });
}
