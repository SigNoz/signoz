import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/dashboards';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// Roles page. RISK MODE — READ-ONLY: never create/edit/delete a role; TC-03
// only views a managed role's detail page and navigates back.
// rolesEnabled probes /api/v1/features for USE_FINE_GRAINED_AUTHZ — real backend
// state, not a guess; row navigation is only wired up when it is on, so TC-03 skips otherwise.

test.describe.configure({ mode: 'serial' });

let rolesEnabled = false;

async function gotoRolesList(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.ROLES);
	await expect(page.getByTestId('roles-settings')).toBeVisible();
}

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		const res = await page.request.get('/api/v1/features', {
			headers: { Authorization: `Bearer ${token}` },
		});
		const body = await res.json();
		const flags: { name?: string; active?: boolean }[] = body?.data ?? [];
		const flag = flags.find((f) => f?.name === 'use_fine_grained_authz');
		rolesEnabled = !!flag?.active;
	} finally {
		await ctx.close();
	}
});

test.describe('Settings — Roles page', () => {
	test('TC-01 list renders with container, header, search, and managed-role rows', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.ROLES),
			personaSkipReason(persona, env, SETTINGS_ROUTES.ROLES) ?? undefined,
		);

		await gotoRolesList(page);

		await expect(page.locator('.roles-settings-header-title')).toContainText(
			'Roles',
		);
		await expect(
			page.locator('.roles-settings-header-description'),
		).toContainText('Create and manage custom roles for your team.');

		await expect(page.locator('input[type="search"]')).toBeVisible();
		await expect(
			page.locator('input[placeholder="Search for roles..."]'),
		).toBeVisible();

		const table = page.locator('.roles-listing-table');
		await expect(table).toBeVisible();
		await expect(table.locator('.roles-table-header-cell--name')).toContainText(
			'Name',
		);
		await expect(
			table.locator('.roles-table-header-cell--description'),
		).toContainText('Description');
		await expect(
			table.locator('.roles-table-header-cell--updated-at'),
		).toContainText('Updated At');
		await expect(
			table.locator('.roles-table-header-cell--created-at'),
		).toContainText('Created At');

		await expect(
			table.locator('.roles-table-section-header', { hasText: 'Managed roles' }),
		).toBeVisible();

		await expect(table.locator('.roles-table-row').first()).toBeVisible();
	});

	test('TC-02 search filters roles by match and shows empty state on no match', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.ROLES),
			personaSkipReason(persona, env, SETTINGS_ROUTES.ROLES) ?? undefined,
		);

		await gotoRolesList(page);

		const searchInput = page.locator('input[placeholder="Search for roles..."]');
		const table = page.locator('.roles-listing-table');

		await searchInput.fill('Admin');
		await expect(
			table.locator('.roles-table-cell--name', { hasText: /admin/i }).first(),
		).toBeVisible();
		await expect(table.locator('.roles-table-empty')).toHaveCount(0);

		await searchInput.fill('xyznonexistentrole999');
		await expect(table.locator('.roles-table-empty')).toBeVisible();
		await expect(table.locator('.roles-table-empty')).toContainText(
			'No roles match your search.',
		);
		await expect(table.locator('.roles-table-row')).toHaveCount(0);

		await searchInput.fill('');
		await expect(table.locator('.roles-table-row').first()).toBeVisible();
		await expect(table.locator('.roles-table-empty')).toHaveCount(0);
	});

	// Read-only: views a managed role, asserts no edit/delete, navigates back.
	// Skipped when USE_FINE_GRAINED_AUTHZ is off — rows have no click handler.
	test('TC-03 role detail page — clicking a managed role navigates to its detail view', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.ROLES),
			personaSkipReason(persona, env, SETTINGS_ROUTES.ROLES) ?? undefined,
		);
		test.skip(
			!rolesEnabled,
			'PERSONA_SKIP: USE_FINE_GRAINED_AUTHZ feature flag is off — role rows are not clickable',
		);

		await gotoRolesList(page);

		const table = page.locator('.roles-listing-table');

		const firstRow = table.locator('.roles-table-row').first();
		await firstRow.scrollIntoViewIfNeeded();
		await firstRow.click();

		await expect(page).toHaveURL(/\/settings\/roles\/[^/]+/);

		const detailPage = page.locator('.role-details-page');
		await expect(detailPage).toBeVisible();
		await expect(detailPage.locator('.role-details-title')).toBeVisible();
		await expect(detailPage.locator('.role-details-title')).toContainText(
			'Role —',
		);

		await expect(
			detailPage.getByText(
				'This is a managed role. Permissions and settings are view-only and cannot be modified.',
			),
		).toBeVisible();

		await expect(
			detailPage.getByRole('button', { name: 'Edit Role Details' }),
		).toHaveCount(0);

		await expect(
			detailPage.locator('.role-details-section-label', {
				hasText: 'Permissions',
			}),
		).toBeVisible();

		await page.goto(SETTINGS_ROUTES.ROLES);
		await expect(page.getByTestId('roles-settings')).toBeVisible();
	});
});
