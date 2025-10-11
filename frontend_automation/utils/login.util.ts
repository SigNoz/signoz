import { Page } from "@playwright/test";

// Read credentials from environment variables
const username = process.env.SIGNOZ_E2E_USERNAME;
const password = process.env.SIGNOZ_E2E_PASSWORD;

/**
 * Ensures the user is logged in. If not, performs the login steps.
 */
export async function ensureLoggedIn(page: Page): Promise<void> {
  // If already in home page, return
  if (page.url().includes("/home")) {
    return;
  }

  if (!username || !password) {
    throw new Error(
      "SIGNOZ_E2E_USERNAME and SIGNOZ_E2E_PASSWORD environment variables must be set."
    );
  }

  await page.goto("/login");
  await page.getByTestId("email").click();
  await page.getByTestId("email").fill(username);
  await page.getByTestId("initiate_login").click();
  await page.getByTestId("password").click();
  await page.getByTestId("password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();

  await page
    .getByText("Hello there, Welcome to your")
    .waitFor({ state: "visible" });
}
