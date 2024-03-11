import { test, expect } from "@playwright/test";
import ROUTES from "../../frontend/src/constants/routes";
import { DATA_TEST_IDS } from "./contants";

test("Check for the dashboard page and individual dashboard to load within 5s", async ({
  page,
}) => {
  // route to the dashboards page and check if the page renders fine
  await Promise.all([
    page.goto(ROUTES.ALL_DASHBOARD),
    page.waitForRequest("**/v1/dashboards"),
  ]);

  const newDashboardBtn = await page
    .locator(`data-testid=${DATA_TEST_IDS.NEW_DASHBOARD_BTN}`)
    .isVisible();

  await expect(newDashboardBtn).toBeTruthy();

  const dashboardListTable = await page
    .locator(`data-testid=${DATA_TEST_IDS.DASHBOARD_LIST_TABLE}`)
    .isVisible();

  await expect(dashboardListTable).toBeTruthy();

  const firstDashboardRow = await page.locator(".dashbord-row-item").first();

  await expect(firstDashboardRow).toBeVisible();

  // wait for all the API calls to succeed on first load
  await page.waitForLoadState("networkidle", { timeout: 5000 });
});
