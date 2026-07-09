import { test, expect } from "../../fixtures/auth";
import {
  assertQuickFiltersSettingsDrawerOpen,
  closeQuickFiltersSettingsPanel,
  DEFAULT_CUSTOM_FILTERS,
  gotoExplorerWithQuickFilters,
  LOGS_EXPLORER_PATH,
  openQuickFiltersSettingsPanel,
  seedCustomFiltersViaApi,
  TRACES_EXPLORER_PATH,
} from "../../helpers/quick-filters";

// smoke tests for settings drawer in quick filters
test.describe("Quick Filters — settings drawer", () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await seedCustomFiltersViaApi(page, "logs", DEFAULT_CUSTOM_FILTERS);
    await seedCustomFiltersViaApi(page, "traces", DEFAULT_CUSTOM_FILTERS);
  });

  test("TC-01 logs explorer — settings gear opens a visible, populated drawer", async ({
    authedPage: page,
  }) => {
    await gotoExplorerWithQuickFilters(page, LOGS_EXPLORER_PATH);
    await openQuickFiltersSettingsPanel(page);
    await assertQuickFiltersSettingsDrawerOpen(page, DEFAULT_CUSTOM_FILTERS);
    await closeQuickFiltersSettingsPanel(page);
    await expect(page.locator(".quick-filters")).toBeVisible();
  });

  test("TC-02 traces explorer — settings gear opens a visible, populated drawer", async ({
    authedPage: page,
  }) => {
    await gotoExplorerWithQuickFilters(page, TRACES_EXPLORER_PATH);
    await openQuickFiltersSettingsPanel(page);
    await assertQuickFiltersSettingsDrawerOpen(page, DEFAULT_CUSTOM_FILTERS);
    await closeQuickFiltersSettingsPanel(page);
    await expect(page.locator(".quick-filters")).toBeVisible();
  });
});
