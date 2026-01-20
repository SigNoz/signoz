import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test('API Keys Settings - View and Interact', async ({ page }) => {
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Focus on the settings page sidenav
	await page.getByTestId('settings-page-sidenav').focus();

	// Click API Keys tab in the settings sidebar (by data-testid)
	await page.getByTestId('api-keys').click();

	// Assert heading and subheading
	await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
	await expect(
		page.getByText('Create and manage API keys for the SigNoz API'),
	).toBeVisible();

	// Assert presence of New Key button
	const newKeyBtn = page.getByRole('button', { name: 'New Key' });
	await expect(newKeyBtn).toBeVisible();

	// Assert table columns
	await expect(page.getByText('Last used').first()).toBeVisible();
	await expect(page.getByText('Expired').first()).toBeVisible();

	// Assert at least one API key row with action buttons
	// Select the first action cell's first button (icon button)
	const firstActionCell = page.locator('table tr').nth(1).locator('td').last();
	const deleteBtn = firstActionCell.locator('button').first();
	await expect(deleteBtn).toBeVisible();
});
