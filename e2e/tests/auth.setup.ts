import { test, expect } from "@playwright/test";
import ROUTES from "../../frontend/src/constants/routes";
import dotenv from "dotenv";

dotenv.config();

const authFile = ".auth/user.json";

test("E2E Login Test", async ({ page }) => {
  await Promise.all([page.goto("/"), page.waitForRequest("**/version")]);

  const signup = "Monitor your applications. Find what is causing issues.";

  const el = await page.locator(`text=${signup}`);

  expect(el).toBeVisible();

  await page
    .locator("id=loginEmail")
    .type(
      process.env.PLAYWRIGHT_USERNAME ? process.env.PLAYWRIGHT_USERNAME : ""
    );

  await page.getByText("Next").click();

  await page
    .locator('input[id="currentPassword"]')
    .fill(
      process.env.PLAYWRIGHT_PASSWORD ? process.env.PLAYWRIGHT_PASSWORD : ""
    );

  await page.locator('button[data-attr="signup"]').click();

  await expect(page).toHaveURL(ROUTES.APPLICATION);

  await page.context().storageState({ path: authFile });
});
