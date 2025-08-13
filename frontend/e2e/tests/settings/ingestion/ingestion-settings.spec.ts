import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test('Ingestion Settings - View and Interact', async ({ page }) => {
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Focus on the settings page sidenav
	await page.getByTestId('settings-page-sidenav').focus();

	// Click Ingestion tab in the settings sidebar (by data-testid)
	await page.getByTestId('ingestion').click();

	// Assert heading and subheading (Integrations page)
	await expect(
		page.getByRole('heading', { name: 'Integrations' }),
	).toBeVisible();
	await expect(
		page.getByText('Manage Integrations for this workspace'),
	).toBeVisible();

	// Assert presence of search box
	await expect(
		page.getByPlaceholder('Search for an integration...'),
	).toBeVisible();

	// Assert at least one data source with Configure button
	const configureBtn = page.getByRole('button', { name: 'Configure' }).first();
	await expect(configureBtn).toBeVisible();

	// Assert Request more integrations section
	await expect(
		page.getByText(
			"Can't find what you’re looking for? Request more integrations",
		),
	).toBeVisible();
	await expect(page.getByPlaceholder('Enter integration name...')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});
