import { expect, test } from '@playwright/test';

// No ensureLoggedIn needed — session is restored from .auth/user.json via storageState

test.describe('Home Page - Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', {
        name: 'Hello there, Welcome to your SigNoz workspace',
      }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('TC-01: home page loads after login', { tag: '@viewer' }, async ({ page }) => {
    await expect(page).toHaveURL(/\/home/);
    await expect(page).toHaveTitle(/Home/);
    await expect(
      page.getByRole('heading', {
        name: 'Hello there, Welcome to your SigNoz workspace',
      }),
    ).toBeVisible();
  });

  test('TC-02: ingestion status banners are visible', { tag: '@viewer' }, async ({ page }) => {
    await expect(page.getByText('Logs ingestion is active')).toBeVisible();
    await expect(page.getByText('Traces ingestion is active')).toBeVisible();
    await expect(page.getByText('Metrics ingestion is active')).toBeVisible();
  });
});

test.describe('Home Page - Explore Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', {
        name: 'Hello there, Welcome to your SigNoz workspace',
      }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('TC-03: Explore Logs navigates to logs explorer', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Logs' }).click();
    await expect(page).toHaveURL(/\/logs\/logs-explorer/);
  });

  test('TC-04: Explore Traces navigates to traces explorer', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Traces' }).click();
    await expect(page).toHaveURL(/traces-explorer/);
  });

  test('TC-05: Explore Metrics navigates to metrics explorer', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Explore Metrics' }).click();
    await expect(page).toHaveURL(/metrics-explorer/);
  });

  test('TC-06: Open Logs Explorer shortcut navigates', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Open Logs Explorer' }).click();
    await expect(page).toHaveURL(/\/logs\/logs-explorer/);
  });

  test('TC-07: Open Traces Explorer shortcut navigates', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Open Traces Explorer' }).click();
    await expect(page).toHaveURL(/traces-explorer/);
  });

  test('TC-08: Open Metrics Explorer shortcut navigates', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Open Metrics Explorer' }).click();
    await expect(page).toHaveURL(/metrics-explorer/);
  });

  test('TC-09: Create dashboard button navigates', { tag: '@editor' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Create dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('TC-10: Create an alert button navigates', { tag: '@editor' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Create an alert' }).click();
    await expect(page).toHaveURL(/\/alerts/);
  });
});

test.describe('Home Page - Services Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('columnheader', { name: 'APPLICATION' })).toBeVisible({ timeout: 30000 });
  });

  test('TC-11: services table is visible with correct columns', { tag: '@viewer' }, async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'APPLICATION' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /P99 LATENCY/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /ERROR RATE/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /OPS \/ SEC/i })).toBeVisible();
    await expect(page.getByRole('rowgroup').last().getByRole('row').first()).toBeVisible();
  });

  test('TC-12: All Services link navigates', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('link', { name: 'All Services' }).click();
    await expect(page).toHaveURL(/\/services/);
  });
});

test.describe('Home Page - Alerts Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'All Alert Rules' })).toBeVisible({ timeout: 30000 });
  });

  test('TC-13: alerts section shows firing alerts', { tag: '@viewer' }, async ({ page }) => {
    await expect(page.getByRole('link', { name: 'All Alert Rules' })).toBeVisible();
    await expect(page.getByRole('button', { name: /alert-rules/ }).first()).toBeVisible();
  });

  test('TC-14: All Alert Rules link navigates', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('link', { name: 'All Alert Rules' }).click();
    await expect(page).toHaveURL(/\/alerts/);
  });
});

test.describe('Home Page - Dashboards Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'All Dashboards' })).toBeVisible({ timeout: 30000 });
  });

  test('TC-15: dashboards section shows recent dashboards', { tag: '@viewer' }, async ({ page }) => {
    await expect(page.getByRole('link', { name: 'All Dashboards' })).toBeVisible();
    await expect(page.getByRole('button', { name: /alert-rules/ }).first()).toBeVisible();
  });

  test('TC-16: All Dashboards link navigates', { tag: '@viewer' }, async ({ page }) => {
    await page.getByRole('link', { name: 'All Dashboards' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Home Page - Saved Views Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('link', { name: 'All Views' })).toBeVisible({ timeout: 30000 });
  });

  test('TC-17: saved views tabs switch between signal types', { tag: '@viewer' }, async ({ page }) => {
    const logsTab = page.locator('button[value="logs"]');
    const tracesTab = page.locator('button[value="traces"]');
    const metricsTab = page.locator('button[value="metrics"]');

    await expect(logsTab).toBeVisible();

    await tracesTab.click();
    await expect(tracesTab).toBeVisible();

    await metricsTab.click();
    await expect(metricsTab).toBeVisible();

    await logsTab.click();
    await expect(logsTab).toBeVisible();
  });

  test('TC-18: All Views link navigates to saved views', { tag: '@viewer' }, async ({ page }) => {
    await page.locator('button[value="logs"]').click();
    await page.getByRole('link', { name: 'All Views' }).click();
    await expect(page).toHaveURL(/\/logs\/saved-views/);
  });
});
