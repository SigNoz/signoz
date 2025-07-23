import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('Notification Channels Settings - View and Interact', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Open settings menu via cog icon
	await page.locator('svg.lucide-cog').first().click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();
	// Click Notification Channels tab in the sidebar
	await page.getByText('Notification Channels').click();

	// Wait for loading to finish
	await page.getByText('loading').first().waitFor({ state: 'hidden' });

	// Assert presence of New Alert Channel button
	const newChannelBtn = page.getByRole('button', { name: /New Alert Channel/ });
	await expect(newChannelBtn).toBeVisible();

	// Assert table columns
	await expect(page.getByText('Name')).toBeVisible();
	await expect(page.getByText('Type')).toBeVisible();
	await expect(page.getByText('Action')).toBeVisible();

	// Click New Alert Channel and assert modal fields/buttons
	await newChannelBtn.click();
	await expect(
		page.getByRole('heading', { name: 'New Notification Channel' }),
	).toBeVisible();
	await expect(page.getByLabel('Name')).toBeVisible();
	await expect(page.getByLabel('Type')).toBeVisible();
	await expect(page.getByLabel('Webhook URL')).toBeVisible();
	await expect(
		page.getByRole('switch', { name: 'Send resolved alerts' }),
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Test' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
	// Close modal
	await page.getByRole('button', { name: 'Back' }).click();

	// Assert Edit and Delete buttons for at least one channel
	const editBtn = page.getByRole('button', { name: 'Edit' }).first();
	const deleteBtn = page.getByRole('button', { name: 'Delete' }).first();
	await expect(editBtn).toBeVisible();
	await expect(deleteBtn).toBeVisible();
});
