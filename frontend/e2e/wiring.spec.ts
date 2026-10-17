import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("End-to-End Wiring Verification", () => {
  test("landing page loads and the CTA routes into the sign-in flow", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "TRACER" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Defense-Only • Razorpay Buildathon 2026")).toBeVisible();

    // Version string in the footer.
    const footer = page.locator("footer").getByText(/TRACER/);
    await expect(footer).toBeVisible();
    expect(await footer.textContent()).toContain("TRACER");

    // Primary CTA opens the simulated sign-in, which then unlocks the shell.
    await page.getByRole("main").getByRole("link", { name: "Open Dashboard" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await login(page);
    await expect(page.getByText("Overview").first()).toBeVisible({ timeout: 15_000 });
  });

  test("sandbox page fires real API calls and shows a risk band", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/sandbox");
    await expect(page.getByRole("heading", { name: "Sandbox" })).toBeVisible({ timeout: 15_000 });

    // Click the Normal UPI preset button.
    await page.locator("button").filter({ hasText: "Normal UPI" }).first().click();

    // The agent trace prints the model line once the API responds.
    const modelLine = page.getByText(/\[MODEL\] risk_score=/);
    await expect(modelLine).toBeVisible({ timeout: 15_000 });
    const text = (await modelLine.textContent()) ?? "";
    expect(text).toMatch(/risk_score=\d+/);
    expect(text).toMatch(/band=(LOW|MEDIUM|HIGH)/);
  });

  test("sandbox ring-building sequence flips ring_detected and scores HIGH", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/sandbox");

    // Click the ring sequence button.
    await page.locator("button").filter({ hasText: "Fire 5-Ring Sequence" }).click();

    // Wait for the completion message.
    await expect(page.getByText("Ring complete")).toBeVisible({ timeout: 20_000 });

    // The final event's model line should score at or above the HIGH threshold.
    const modelLine = page.getByText(/\[MODEL\] risk_score=/);
    await expect(modelLine).toBeVisible({ timeout: 20_000 });
    const text = (await modelLine.textContent()) ?? "";
    const score = Number(text.match(/risk_score=(\d+)/)?.[1] ?? 0);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  test("graph page renders the topology canvas with entity counts", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/graph");

    await expect(page.getByRole("heading", { name: "Entity Graph" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /MULE-RING GRAPH CANVAS/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d+ nodes/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d+ edges/)).toBeVisible();
  });
});
