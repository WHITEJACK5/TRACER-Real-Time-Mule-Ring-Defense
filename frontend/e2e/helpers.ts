import type { Page } from "@playwright/test";

/** Sign in through the simulated login form and land on the dashboard. */
export async function login(page: Page, email = "analyst@razorpay.com") {
  await page.goto("/login");
  await page.getByPlaceholder("analyst@razorpay.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("tracer-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}
