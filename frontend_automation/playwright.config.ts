import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./tests",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Workers
  workers: process.env.CI ? 2 : undefined,

  // Reporter
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],

  // Shared settings
  use: {
    baseURL:
      process.env.SIGNOZ_E2E_BASE_URL || "https://app.us.staging.signoz.cloud",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    colorScheme: "dark",
    locale: "en-US",
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for multiple browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
