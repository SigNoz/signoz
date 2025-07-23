import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('API Keys Settings - View and Interact', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Open settings menu via cog icon
	await page.locator('svg.lucide-cog').first().click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();
	// Click API Keys tab in the sidebar
	await page.getByText('API Keys').first().click();

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
