import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('View General Settings', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Click the cog/settings icon in the sidebar (works for collapsed or expanded)
	await page.locator('svg.lucide-cog').first().click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();

	// Wait for General tab to be visible
	await page.getByRole('tabpanel', { name: 'General' }).waitFor();

	// Assert visibility of definitive/static elements
	await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Traces' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible();
	await expect(page.getByText('Please')).toBeVisible();
	await expect(page.getByRole('link', { name: 'email us' })).toBeVisible();
});
