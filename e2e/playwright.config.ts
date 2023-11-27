import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./tests",

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  name: "Signoz E2E",

  retries: process.env.CI ? 2 : 0,

  reporter: process.env.CI ? "github" : "list",

  preserveOutput: "always",

  updateSnapshots: "all",

  quiet: false,

  testMatch: ["**/*.spec.ts"],

  use: {
    trace: "on-first-retry",

    baseURL:
      process.env.PLAYWRIGHT_TEST_BASE_URL || "https://stagingapp.signoz.io/",
  },

  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use prepared auth state.
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
