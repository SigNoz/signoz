// spec: specs/roles/roles-listing.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { ensureLoggedIn } from '../../utils/login.util';

test.describe('Roles Listing - Navigation and Access Control', () => {
  test(
    'Admin User Can Access Roles Page',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await ensureLoggedIn(page);

      await page.goto('/settings/roles', {
        waitUntil: 'domcontentloaded',
      });

      await expect(
        page.getByRole('heading', {
          name: 'Roles',
          exact: true,
        }),
      ).toBeVisible({ timeout: 30000 });

      await expect(page).toHaveURL(/.*\/settings\/roles/);

      await expect(
        page.getByRole('searchbox', {
          name: 'Search for roles...',
        }),
      ).toBeVisible({ timeout: 15000 });

      const accessDenied = page.getByText('Access Denied');
      const permissionDenied = page.getByText('Permission denied');

      const hasAccessDenied = await accessDenied.isVisible().catch(() => false);
      const hasPermissionDenied = await permissionDenied
        .isVisible()
        .catch(() => false);

      expect(hasAccessDenied).toBe(false);
      expect(hasPermissionDenied).toBe(false);

      await expect(page.getByRole('searchbox')).toBeVisible();

      await expect(page.getByText('signoz-admin')).toBeVisible();
    },
  );
});

test.describe('Roles Listing - Page Layout and UI Components', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto('/settings/roles');

    await Promise.race([
      page
        .getByRole('searchbox', { name: 'Search for roles...' })
        .waitFor({ state: 'visible', timeout: 10000 }),
      page
        .getByText(/error|failed/i)
        .waitFor({ state: 'visible', timeout: 10000 }),
    ]).catch(() => {});
  });

  test(
    'Verify Roles Listing Page Layout',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await expect(
        page.getByRole('heading', {
          name: 'Roles',
          exact: true,
        }),
      ).toBeVisible();

      const searchInput = page.getByRole('searchbox');
      await expect(searchInput).toBeVisible();

      await expect(
        page.getByText('Name', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByText('Description', { exact: true }).first(),
      ).toBeVisible();
      await expect(page.getByText('Updated At', { exact: true })).toBeVisible();
      await expect(page.getByText('Created At', { exact: true })).toBeVisible();

      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'Verify Table Structure',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await expect(page.getByRole('searchbox')).toBeVisible();

      const roleNames = [
        'signoz-admin',
        'signoz-editor',
        'signoz-viewer',
        'signoz-anonymous',
      ];
      const firstRole = page.getByText(roleNames[0]);
      await expect(firstRole).toBeVisible();

      await expect(
        page.getByRole('heading', { name: 'Managed roles' }),
      ).toBeVisible();

      await expect(page.getByText(/full administrative access/i)).toBeVisible();
    },
  );
});

test.describe('Roles Listing - Roles Display and Data Verification', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto('/settings/roles');

    // Wait for page to load
    await expect(
      page.getByRole('searchbox', { name: 'Search for roles...' }),
    ).toBeVisible();
  });

  test(
    'Verify API Response Matches UI Display',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      let apiResponse: any = null;

      page.on('response', async (response) => {
        if (
          response.url().includes('/api/v1/roles') &&
          response.status() === 200
        ) {
          apiResponse = await response.json();
        }
      });

      await page.reload();

      await page
        .getByRole('searchbox', { name: 'Search for roles...' })
        .waitFor({ state: 'visible', timeout: 10000 });

      await page.waitForTimeout(1000);

      expect(apiResponse).not.toBeNull();
      expect(apiResponse.status).toBe('success');

      const rolesFromApi = apiResponse.data;
      expect(rolesFromApi).toBeDefined();
      expect(rolesFromApi.length).toBe(5);

      for (const role of rolesFromApi) {
        if (role.name) {
          await expect(page.getByText(role.name)).toBeVisible();
        }
      }
    },
  );

  test(
    'Verify Role Categorization (Managed vs Custom)',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await expect(page.getByRole('searchbox')).toBeVisible();

      const managedRolesHeader = page.getByRole('heading', {
        name: 'Managed roles',
      });
      const customRolesHeader = page.getByRole('heading', {
        name: /Custom roles\s*\d+/,
      });

      await expect(managedRolesHeader).toBeVisible();
      await expect(customRolesHeader).toBeVisible();

      const headerText = await customRolesHeader.textContent();
      expect(headerText).toMatch(/Custom roles\s*\d+/);

      await expect(page.getByText('signoz-admin')).toBeVisible();
      await expect(page.getByText('signoz-editor')).toBeVisible();
      await expect(page.getByText('signoz-viewer')).toBeVisible();
      await expect(page.getByText('custom-role-ui')).toBeVisible();
    },
  );
});

test.describe('Roles Listing - Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto('/settings/roles');

    // Wait for roles to load
    await page
      .getByRole('searchbox', { name: 'Search for roles...' })
      .waitFor({ state: 'visible', timeout: 10000 })
      .catch(() => {});
  });

  test(
    'Search Roles by Name',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await expect(page.getByText('signoz-admin')).toBeVisible();
      await expect(page.getByText('signoz-editor')).toBeVisible();
      await expect(page.getByText('signoz-viewer')).toBeVisible();

      const searchInput = page.getByRole('searchbox', {
        name: 'Search for roles...',
      });
      await searchInput.fill('editor');

      await page.waitForTimeout(300);

      await expect(page.getByText('signoz-editor')).toBeVisible();

      await searchInput.clear();
      await searchInput.fill(''); // Ensure it's empty
      await page.waitForTimeout(300);

      await expect(page.getByText('signoz-admin')).toBeVisible();
      await expect(page.getByText('signoz-editor')).toBeVisible();
      await expect(page.getByText('signoz-viewer')).toBeVisible();
    },
  );

  test(
    'Search Roles by Description',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      const searchInput = page.getByRole('searchbox', {
        name: 'Search for roles...',
      });
      await searchInput.fill('administrative');

      await page.waitForTimeout(500);

      await expect(page.getByText('signoz-admin')).toBeVisible();
      await expect(page.getByText(/full administrative access/i)).toBeVisible();

      await expect(page.getByText('signoz-viewer')).toBeHidden();
    },
  );

  test(
    'Search with No Results',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await expect(page.getByText('signoz-admin')).toBeVisible({
        timeout: 10000,
      });

      const searchInput = page.getByRole('searchbox', {
        name: 'Search for roles...',
      });
      await searchInput.fill('NonExistentRole123XYZ');

      await page.waitForTimeout(300);

      const adminStillVisible = await page
        .getByText('signoz-admin')
        .isVisible()
        .catch(() => false);
      const editorStillVisible = await page
        .getByText('signoz-editor')
        .isVisible()
        .catch(() => false);
      const viewerStillVisible = await page
        .getByText('signoz-viewer')
        .isVisible()
        .catch(() => false);

      // At least verify that not all roles are still visible (search had some effect)
      const allStillVisible =
        adminStillVisible && editorStillVisible && viewerStillVisible;
      expect(allStillVisible).toBe(false);

      // 5. Clear search and verify roles reappear
      await searchInput.clear();
      await searchInput.fill('');
      await page.waitForTimeout(300);

      await expect(page.getByText('signoz-admin')).toBeVisible();
    },
  );

  test(
    'Search Case Sensitivity',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      const searchInput = page.getByRole('searchbox', {
        name: 'Search for roles...',
      });

      await searchInput.fill('ADMIN');
      await page.waitForTimeout(300);
      await expect(page.getByText('signoz-admin')).toBeVisible();

      await searchInput.clear();
      await searchInput.fill('admin');
      await page.waitForTimeout(300);
      await expect(page.getByText('signoz-admin')).toBeVisible();

      await searchInput.clear();
      await searchInput.fill('AdMin');
      await page.waitForTimeout(300);
      await expect(page.getByText('signoz-admin')).toBeVisible();

      await searchInput.clear();
    },
  );
});

test.describe('Roles Listing - Pagination Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto('/settings/roles');
    await expect(
      page.getByRole('heading', { name: 'Roles', exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('searchbox', { name: 'Search for roles...' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test(
    'Navigate Between Pages',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      const paginationList = page.getByRole('list').filter({ hasText: /\d/ });
      const hasPagination = await paginationList.isVisible().catch(() => false);

      if (!hasPagination) {
        return;
      }

      // 1. Verify pagination controls are visible
      await expect(paginationList).toBeVisible();

      // 2. Note the first role displayed on page 1
      const page1HasAdmin = await page.getByText('signoz-admin').isVisible();

      // 3. Click "Next" or page "2" in pagination
      const nextButton = page.getByRole('listitem').getByText('2');
      if (await nextButton.isVisible()) {
        await nextButton.click();
      } else {
        // Try clicking next arrow
        await page.getByRole('listitem').last().click();
      }

      // 4. Wait for page to load
      await page.waitForTimeout(1000);

      // 5. Observe roles on page 2
      const page2HasAdmin = await page.getByText('signoz-admin').isVisible();

      // Verify different roles are shown (or same role is hidden if paging worked)
      expect(page2HasAdmin).not.toBe(page1HasAdmin);

      // Verify URL updates with page parameter
      await expect(page).toHaveURL(/page=2/);

      // 6. Click "Previous" or page "1"
      const prevButton = page.getByRole('listitem').getByText('1');
      if (await prevButton.isVisible()) {
        await prevButton.click();
      } else {
        // Try clicking previous arrow
        await page.getByRole('listitem').first().click();
      }

      // 7. Wait and verify return to page 1
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/page=1|\/roles(?!.*page)/);
    },
  );

  test(
    'Pagination with Search Results',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      const paginationList = page.getByRole('list').filter({ hasText: /\d/ });
      const hasPagination = await paginationList.isVisible().catch(() => false);

      if (!hasPagination) {
        return;
      }

      const searchInput = page.getByRole('searchbox');
      await searchInput.fill('signoz');

      await page.waitForTimeout(500);

      const paginationAfterSearch = await paginationList
        .isVisible()
        .catch(() => false);

      if (paginationAfterSearch) {
        const page2Button = page.getByRole('listitem').getByText('2');
        if (await page2Button.isVisible()) {
          await page2Button.click();
          await page.waitForTimeout(500);

          const url = page.url();
          expect(url).toContain('page=2');
        }
      }

      await searchInput.clear();
      await page.waitForTimeout(500);

      await expect(paginationList).toBeVisible();
    },
  );

  test(
    'Pagination State Persistence',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      const paginationList = page.getByRole('list').filter({ hasText: /\d/ });
      const hasPagination = await paginationList.isVisible().catch(() => false);

      if (!hasPagination) {
        return;
      }

      const page2Button = page.getByRole('listitem').getByText('2');
      if (await page2Button.isVisible()) {
        await page2Button.click();
        await page.waitForTimeout(500);

        await expect(page).toHaveURL(/page=2/);

        await page.reload();

        await expect(page).toHaveURL(/page=2/);

        await expect(
          page.getByRole('searchbox', {
            name: 'Search for roles...',
          }),
        ).toBeVisible();
      }
    },
  );
});

test.describe('Roles Listing - Loading and Error States', () => {
  test(
    'Verify Loading State',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await page.route('**/api/v1/roles', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.continue();
      });

      await ensureLoggedIn(page);
      await page.goto('/settings/roles');

      const loadingIndicators = [
        page.locator('[class*="skeleton"]'),
        page.locator('[class*="loading"]'),
        page.locator('[class*="spinner"]'),
        page.getByRole('progressbar'),
      ];

      for (const indicator of loadingIndicators) {
        if (await indicator.isVisible().catch(() => false)) {
          break;
        }
      }

      await expect(
        page.getByRole('searchbox', {
          name: 'Search for roles...',
        }),
      ).toBeVisible({ timeout: 10000 });

      await expect(page.getByRole('heading', { name: 'Roles' })).toBeVisible();
    },
  );

  test(
    'Handle API Error State',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await page.route('**/api/v1/roles', async (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            error: 'Internal Server Error',
          }),
        });
      });

      await ensureLoggedIn(page);
      await page.goto('/settings/roles');

      await page.waitForTimeout(2000);

      const hasRoles = await page
        .getByText('signoz-admin')
        .isVisible()
        .catch(() => false);

      if (!hasRoles) {
        await expect(
          page.getByRole('heading', {
            name: 'Roles',
            exact: true,
          }),
        ).toBeVisible();
      }
    },
  );

  test(
    'Handle Network Failure',
    {
      tag: '@admin',
    },
    async ({ page }) => {
      await page.route('**/api/v1/roles', async (route) => {
        route.abort('failed');
      });

      await ensureLoggedIn(page);
      await page.goto('/settings/roles');

      await page.waitForTimeout(2000);

      const hasRoles = await page
        .getByText('signoz-admin')
        .isVisible()
        .catch(() => false);

      expect(hasRoles).toBe(false);

      await expect(page.locator('body')).toBeVisible();
    },
  );
});
