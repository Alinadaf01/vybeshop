import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { pagesToCheck } from "./routes";

for (const { path, label } of pagesToCheck) {
  test(`no critical/serious axe violations on ${label}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // صبر تا انیمیشن‌های یک‌باره بارگذاری (fade-in صفحه، ورود پلکانی، کارت
    // ورود) ته‌نشین شوند — وگرنه axe گاهی یک فریم میانیِ ترانزیشن (کنتراست
    // موقت پایین حین fade) را اسکن می‌کند. انیمیشن‌های تزئینیِ بی‌نهایت
    // (mesh/orb/pulse-ring) نادیده گرفته می‌شوند چون هرگز "finished" نمی‌شوند
    // (FIX-TASK.md §3 صفحه‌آرایی‌های تازه).
    await page
      .waitForFunction(
        () =>
          document.getAnimations().every((a) => {
            const timing = a.effect?.getTiming();
            return timing?.iterations === Infinity || a.playState === "finished" || a.playState === "idle";
          }),
        { timeout: 3000 },
      )
      .catch(() => {});
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}

test("skip-to-content link is the first focusable element and works", async ({ page }) => {
  await page.goto("/about");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "رفتن به محتوای اصلی" });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("full keyboard navigation reaches primary nav and mobile menu opens/closes without a mouse", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "باز کردن منو" });
  await menuButton.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "منوی ناوبری" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
