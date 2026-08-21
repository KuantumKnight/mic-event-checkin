import { expect, test } from "@playwright/test";

test("signed-out visitors land on the real auth screen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page.getByText("Simulate check-in")).toHaveCount(0);
});

test("login screen exposes both account paths", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
});
