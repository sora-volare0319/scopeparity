import { defineConfig, devices } from "@playwright/test";

const productionBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: productionBaseUrl ?? "http://127.0.0.1:4187",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: productionBaseUrl
    ? undefined
    : {
        command: "pnpm build && pnpm preview --host 127.0.0.1 --port 4187",
        url: "http://127.0.0.1:4187",
        reuseExistingServer: false,
        timeout: 30_000,
      },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
