import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('Ingestion Settings - View and Interact', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Open settings menu via cog icon
	await page.locator('svg.lucide-cog').first().click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();
	// Click Ingestion tab in the sidebar
	await page.getByText('Ingestion', { exact: true }).click();

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
