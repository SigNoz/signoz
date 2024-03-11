import { test, expect } from "@playwright/test";
import ROUTES from "../../frontend/src/constants/routes";
import { DATA_TEST_IDS } from "./contants";

test("Check for the dashboard page and individual dashboard to load within 5s", async ({
  page,
}) => {
  // route to the dashboards page and check if the page renders fine
  let requestCount = 0;
  let finishedRequestsCount = 0;
  const dashboardAPIEndpoints = [
    "v4/query_range",
    "v2/variables/query",
    "v1/dashboards/",
  ];

  page.on("request", (r) => {
    if (dashboardAPIEndpoints.some((api) => r.url().includes(api)))
      requestCount++;
  });

  page.on("requestfinished", (r) => {
    if (dashboardAPIEndpoints.some((api) => r.url().includes(api)))
      finishedRequestsCount++;
  });
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

  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(finishedRequestsCount, requestCount, "timeout");
      if (finishedRequestsCount < requestCount) {
        reject(new Error("Not all requests completed within 5 seconds."));
      } else {
        resolve("All requests completed within 5 seconds.");
      }
    }, 5000);
  });
  await firstDashboardRow.click();

  await timeoutPromise;
});
