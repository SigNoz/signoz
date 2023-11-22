import { test } from "@playwright/test";
import ROUTES from "../../frontend/src/constants/routes";

test("Basic Navigation Check across different resources", async ({ page }) => {
  await page.goto(ROUTES.APPLICATION);

  await page.pause();
});
