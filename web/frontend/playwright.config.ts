import { defineConfig, devices } from "@playwright/test";

const database = process.env.TEST_DATABASE_URL;
if (!database || !new URL(database).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URL must point to a migrated disposable database ending in _test.");

export default defineConfig({
  testDir: "./test",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: "http://localhost:4273", trace: "retain-on-failure", launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } },
  projects: [{ name: "chromium-mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } }],
  webServer: [
    {
      command: "pnpm --filter @replens/backend start:prod",
      cwd: "../..",
      url: "http://127.0.0.1:3123/api/health",
      env: {
        DATABASE_URL: database,
        BETTER_AUTH_SECRET: "isolated-browser-test-secret-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:4273",
        FRONTEND_ORIGINS: "http://localhost:4273",
        PORT: "3123",
        HOST: "127.0.0.1",
        NODE_ENV: "test",
      },
    },
    {
      command: "pnpm exec vite --port 4273",
      url: "http://localhost:4273",
      env: { API_PROXY_TARGET: "http://127.0.0.1:3123" },
    },
  ],
});
