import { test, expect } from "@playwright/test";
import ROUTES from "../../frontend/src/constants/routes";
import { DATA_TEST_IDS, SERVICE_TABLE_HEADERS } from "./contants";

test("Basic Navigation Check across different resources", async ({ page }) => {
  // route to services page and check if the page renders fine with BE contract
  await Promise.all([
    page.goto(ROUTES.APPLICATION),
    page.waitForRequest("**/v1/services"),
  ]);

  const p99Latency = page.locator(
    `th:has-text("${SERVICE_TABLE_HEADERS.P99LATENCY}")`
  );

  await expect(p99Latency).toBeVisible();

  // route to the new trace explorer page and check if the page renders fine
  await page.goto(ROUTES.TRACES_EXPLORER);

  await page.waitForLoadState("networkidle");

  const listViewTable = await page
    .locator('div[role="presentation"]')
    .isVisible();

  expect(listViewTable).toBeTruthy();

  // route to the dashboards page and check if the page renders fine
  await Promise.all([
    page.goto(ROUTES.ALL_DASHBOARD),
    page.waitForRequest("**/v1/dashboards"),
  ]);

  const newDashboardBtn = await page
    .locator(`data-testid=${DATA_TEST_IDS.NEW_DASHBOARD_BTN}`)
    .isVisible();

  expect(newDashboardBtn).toBeTruthy();
});
