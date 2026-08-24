import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 900 } });

test("home -> products -> filter by category -> product detail", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Home -> products via the hero CTA (real link click, not a direct goto).
  await page.getByRole("link", { name: "کاوش محصولات" }).click();
  await expect(page).toHaveURL(/\/products$/);

  const productGrid = page.locator("a").filter({ has: page.locator('img, [role="img"]') });
  await expect(page.getByText(/محصول از/)).toBeVisible();
  const countBefore = await productGrid.count();

  // Filter by the first available category checkbox in the sidebar.
  const firstCategoryLabel = page.locator("aside label").first();
  const categoryName = (await firstCategoryLabel.locator("span").first().textContent())?.trim();
  await firstCategoryLabel.click();

  await expect(page).toHaveURL(/[?&]category=/);
  await page.waitForTimeout(400); // fake API delay in src/lib/api.ts
  const countAfter = await productGrid.count();
  expect(countAfter).toBeLessThanOrEqual(countBefore);
  expect(countAfter).toBeGreaterThan(0);

  // Active filter chip should show the category we picked.
  if (categoryName) {
    await expect(page.getByText(categoryName, { exact: true }).first()).toBeVisible();
  }

  // Products -> product detail via a real card click.
  const firstProductLink = page.locator('main a[href^="/products/"]').first();
  const productHref = await firstProductLink.getAttribute("href");
  await firstProductLink.click();
  await expect(page).toHaveURL(new RegExp(productHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "افزودن به سبد" })).toBeVisible();
  await expect(page.getByText(/تومان/).first()).toBeVisible();
});
