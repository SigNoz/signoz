import { test, expect } from "@playwright/test";
import { ensureLoggedIn } from "../utils/login.util";

/**
 * Seed test for Playwright Agents
 *
 * This test serves as:
 * 1. A foundation for all agent-generated tests
 * 2. An example of test structure and patterns
 * 3. Initial setup for authentication
 */
test("seed", async ({ page }) => {
  // Login to the application
  await ensureLoggedIn(page);

  // Verify we're on the home page
  await expect(page).toHaveURL(/.*\/home/);
  await expect(page.getByText("Hello there, Welcome to your")).toBeVisible();
});
