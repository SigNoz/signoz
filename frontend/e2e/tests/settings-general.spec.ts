import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../utils/login.util';

// E2E: View General Settings

test('View General Settings', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Open sidebar menu and click Settings
	await page.getByText('Settings').click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();

	// Wait for General tab to be visible
	await page.getByRole('tabpanel', { name: 'General' }).waitFor();

	// Validate presence of headings and retention period fields
	await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Traces' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible();

	// Validate support message is present
	await expect(page.getByText('Please')).toBeVisible();
	await expect(page.getByRole('link', { name: 'email us' })).toBeVisible();
});
