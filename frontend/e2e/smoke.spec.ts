import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/**
 * Smoke suite for the TRACER landing page and the signed-in shell.
 * Verifies the hero copy and sign-in CTA, and that the theme toggle flips
 * the `<html>` class and persists across a reload (next-themes).
 */
test.describe("TRACER landing page", () => {
  test("renders hero copy and the sign-in CTA", async ({ page }) => {
    await page.goto("/");

    // Brand mark.
    await expect(page.getByRole("link", { name: "TRACER" })).toBeVisible();

    // Hero headline — TextReveal splits it into spans, so assert on the
    // (re-combined) heading text rather than a single element.
    const heading = page.locator("h1");
    await expect(heading).toContainText("topology");

    // Primary call-to-action in the hero routes into the sign-in flow.
    const cta = page.getByRole("main").getByRole("link", { name: "Open Dashboard" });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/login");
  });

  test("theme toggle switches and persists across reload", async ({ page }) => {
    await login(page);

    const toggle = page.locator('[aria-label="Toggle color theme"]');
    await expect(toggle).toBeVisible();

    const isDark = () =>
      page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );

    const before = await isDark();

    await toggle.click();

    await expect
      .poll(isDark, { timeout: 10_000 })
      .not.toBe(before);

    const afterToggle = await isDark();
    expect(afterToggle).not.toBe(before);

    // Reload and confirm the choice survived (next-themes persists to storage).
    await page.reload();
    await expect
      .poll(isDark, { timeout: 10_000 })
      .toBe(afterToggle);
  });
});
