import { expect, test } from "@playwright/test";

test("public landing and login pages are available", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /让商品图片/ })).toBeVisible();
  await page.getByRole("link", { name: "登录控制台" }).click();
  await expect(page.getByRole("heading", { name: "登录控制台" })).toBeVisible();
});
