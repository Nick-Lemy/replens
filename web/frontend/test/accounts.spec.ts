import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const requireBackend = createRequire(new URL("../../backend/package.json", import.meta.url));
const { Pool } = requireBackend("pg");
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const emails: string[] = [];
const password = "Browser-test-password-123!";

test.afterAll(async () => {
  for (const email of emails) await pool.query("DELETE FROM users WHERE email = $1", [email]);
  await pool.end();
});

async function signup(page: import("@playwright/test").Page) {
  const email = `browser-${randomUUID()}@example.test`;
  emails.push(email);
  await page.getByRole("button", { name: "Open account setup" }).click();
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Browser Lifter");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/#profile");
  await expect(page.getByRole("heading", { name: "Browser Lifter" })).toBeVisible();
  return email;
}

test("real signup, cookie restoration, invalid credentials, signin and logout", async ({ page, context }) => {
  await page.goto("/");
  const email = await signup(page);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const cookie = (await context.cookies()).find(cookie => cookie.name.includes("session_token"));
  expect(cookie?.httpOnly).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Browser Lifter" })).toBeVisible();
  await expect.poll(async () => pool.query("SELECT id FROM users WHERE email=$1", [email]).then((result: { rowCount: number }) => result.rowCount)).toBe(1);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Guest account" })).toBeVisible();
  await page.getByRole("button", { name: "Sign in or create account", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Incorrect-password-123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Email or password is incorrect");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Browser Lifter" })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).not.toContain("token");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(password);
  await page.screenshot({ path: "test-results/profile-mobile.png", fullPage: true });
});

test("expired real database session clears identity on focus", async ({ page }) => {
  await page.goto("/");
  const email = await signup(page);
  await pool.query('UPDATE sessions SET "expiresAt" = NOW() - INTERVAL \'1 hour\' WHERE "userId" IN (SELECT id FROM users WHERE email=$1)', [email]);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("heading", { name: "Guest account" })).toBeVisible();
});

test("dialog validation, keyboard dismissal, focus return and phone fit", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Open account setup" });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill(" ");
  await page.getByLabel("Email", { exact: true }).fill("invalid");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  expect(await page.locator("form").evaluate((form: HTMLFormElement) => form.checkValidity())).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("network failure does not claim signin and recovers through retry", async ({ page }) => {
  await page.route("**/api/me", route => route.abort("failed"));
  await page.goto("/#profile");
  await expect(page.getByRole("heading", { name: "Account unavailable" })).toBeVisible();
  await page.unroute("**/api/me");
  await page.getByRole("button", { name: "Retry connection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Guest account" })).toBeVisible();
});

test("successful signup with a failed session read shows unavailable, not invented identity", async ({ page }) => {
  await page.goto("/");
  await expect.poll(async () => page.getByRole("button", { name: "Open account setup" }).count()).toBe(1);
  await page.route("**/api/me", route => route.abort("failed"));
  const email = `browser-${randomUUID()}@example.test`;
  emails.push(email);
  await page.getByRole("button", { name: "Open account setup" }).click();
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Browser Lifter");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Cannot reach account services");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close account form" }).click();
  await page.unroute("**/api/me");
  await page.getByRole("button", { name: "Retry connection", exact: true }).click();
  await page.goto("/#profile");
  await expect(page.getByRole("heading", { name: "Browser Lifter" })).toBeVisible();
});

test("an earlier guest response cannot overwrite newer authenticated state", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let first = true;
  await page.route("**/api/me", async route => {
    if (!first) return route.continue();
    first = false;
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  await page.goto("/");
  await signup(page);
  release();
  await expect(page.getByRole("heading", { name: "Browser Lifter" })).toBeVisible();
  await page.unroute("**/api/me");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Browser Lifter" })).toBeVisible();
});

test("guest camera tracks stop on navigation and backgrounding", async ({ page, context }) => {
  await context.grantPermissions(["camera"]);
  await page.goto("/#live");
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  const preview = page.getByLabel("Live camera preview");
  await expect.poll(() => preview.evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream | null)?.getVideoTracks()[0]?.readyState)).toBe("live");
  await preview.evaluate((video: HTMLVideoElement) => { (window as unknown as { testTrack: MediaStreamTrack }).testTrack = (video.srcObject as MediaStream).getVideoTracks()[0]; });
  await page.locator('nav[aria-label="Main navigation"]:visible').getByRole("link", { name: "Guide", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { testTrack: MediaStreamTrack }).testTrack.readyState)).toBe("ended");
  await page.goto("/#live");
  await page.getByRole("button", { name: "Enable camera", exact: true }).click();
  await expect.poll(() => preview.evaluate((video: HTMLVideoElement) => (video.srcObject as MediaStream | null)?.getVideoTracks()[0]?.readyState)).toBe("live");
  await preview.evaluate((video: HTMLVideoElement) => { (window as unknown as { testTrack: MediaStreamTrack }).testTrack = (video.srcObject as MediaStream).getVideoTracks()[0]; });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { testTrack: MediaStreamTrack }).testTrack.readyState)).toBe("ended");
});
