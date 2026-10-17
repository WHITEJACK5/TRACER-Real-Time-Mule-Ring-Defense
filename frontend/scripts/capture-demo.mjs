import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const OUT = process.env.OUTPUT_DIR ?? "demo-captures";
const SHOTS = path.join(OUT, "screenshots");
const VID = path.join(OUT, "video");
fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(VID, { recursive: true });

const browser = await chromium.launch();

// ---------- Pass 1: screenshots. Reduced motion so every scroll-reveal is
// rendered instantly and full-page captures never contain hidden text.
console.log("Pass 1: screenshots ->", SHOTS);
{
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const shot = async (name, fullPage = true) => {
    await page.screenshot({ path: path.join(SHOTS, name), fullPage });
    console.log("  shot:", name);
  };

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await shot("01-landing.png");

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await shot("02-login.png", false);

  await page.getByPlaceholder("analyst@razorpay.com").fill("analyst@razorpay.com");
  await page.getByPlaceholder("••••••••").fill("tracer-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30000 });
  await page.waitForTimeout(3000);
  await shot("03-overview.png");

  await page.goto(`${BASE}/dashboard/sandbox`);
  await page.locator("button").filter({ hasText: "Mule Ring (5 txns)" }).click();
  await page.getByText(/\[MODEL\] risk_score=/).waitFor({ timeout: 20000 });
  await page.waitForTimeout(1600);
  await shot("07-sandbox-result.png");

  // Build the 5-ring live before the graph capture so the canvas renders the
  // ring as structure (fan-out hub + flagged mule nodes), not a single event.
  await page.locator("button").filter({ hasText: "Fire 5-Ring Sequence" }).click();
  await page.getByText("Ring complete").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.goto(`${BASE}/dashboard/graph`);
  await page.waitForTimeout(2500);
  await page.getByPlaceholder("Override live center — or leave blank").fill("DEV-MULE-RING-01");
  await page.getByRole("button", { name: "Re-center" }).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(800);
  await shot("04-graph.png");

  await page.goto(`${BASE}/dashboard/ledger`);
  await page.waitForTimeout(2000);
  await shot("05-ledger.png");

  await page.goto(`${BASE}/dashboard/transactions`);
  await page.waitForTimeout(2000);
  await shot("06-transactions.png");

  await page.goto(`${BASE}/dashboard/settings`);
  await page.waitForTimeout(1500);
  await shot("08-settings.png");

  await page.goto(`${BASE}/dashboard/account`);
  await page.waitForTimeout(1200);
  await shot("09-account.png");

  await page.goto(`${BASE}/dashboard/accessibility`);
  await page.waitForTimeout(1200);
  await shot("10-accessibility.png");

  await context.close();
}

// ---------- Pass 2: recorded walkthrough (normal motion, real user journey).
console.log("Pass 2: recorded walkthrough");
const videoBefore = new Set(fs.readdirSync(VID));
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: VID, size: { width: 1600, height: 900 } },
});
const page = await context.newPage();
const pause = (ms) => page.waitForTimeout(ms);

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await pause(3500);
for (let y = 0; y < 6; y++) {
  await page.mouse.wheel(0, 700);
  await pause(900);
}
await page.mouse.wheel(0, -6000);
await pause(800);

await page.getByRole("main").getByRole("link", { name: "Open Dashboard" }).click();
await page.waitForURL("**/login");
await pause(1200);
await page.getByPlaceholder("analyst@razorpay.com").pressSequentially("analyst@razorpay.com", { delay: 12 });
await page.getByPlaceholder("••••••••").pressSequentially("tracer-demo", { delay: 20 });
await pause(400);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/dashboard", { timeout: 30000 });
await pause(4000);

await page.locator('a[href="/dashboard/sandbox"]').first().click();
await pause(1500);
await page.locator("button").filter({ hasText: "Fire 5-Ring Sequence" }).click();
await page.getByText("Ring complete").waitFor({ timeout: 30000 });
await pause(3500);
await page.locator('a[href="/dashboard/graph"]').first().click();
await pause(4500);
await page.locator('a[href="/dashboard/ledger"]').first().click();
await pause(3500);
await page.locator('a[href="/dashboard"]').first().click();
await pause(3000);

await context.close();
await browser.close();

const webm = fs.readdirSync(VID).find((f) => !videoBefore.has(f) && f.endsWith(".webm"));
if (webm) {
  const dest = path.join(OUT, "tracer-walkthrough.webm");
  fs.renameSync(path.join(VID, webm), dest);
  console.log("video:", dest);
} else {
  console.log("WARN: no video file produced");
}
console.log("done");
