import { test, expect } from "@playwright/test";
import ROUTES from "../../frontend/src/constants/routes";
import { SERVICE_TABLE_HEADERS } from "./contants";

test("Basic Navigation Check across different resources", async ({ page }) => {
  await Promise.all([
    page.goto(ROUTES.APPLICATION),
    page.waitForRequest("**/v1/services"),
  ]);

  const p99Latency = page.locator(
    `th:has-text("${SERVICE_TABLE_HEADERS.P99LATENCY}")`
  );

  await expect(p99Latency).toBeVisible();

  await page.goto(ROUTES.TRACES_EXPLORER);

  await page.pause();
});
