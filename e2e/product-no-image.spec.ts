import { test, expect } from "@playwright/test";

test("product with no images renders a placeholder instead of crashing", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/products/test-product-no-image");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/تومان/).first()).toBeVisible();
  expect(pageErrors).toHaveLength(0);
});
