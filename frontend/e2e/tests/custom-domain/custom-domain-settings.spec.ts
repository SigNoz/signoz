import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('Custom Domain Settings - View and Interact', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Open settings menu via cog icon
	await page.locator('svg.lucide-cog').first().click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();
	// Click Custom Domain tab in the sidebar
	await page.getByText('Custom Domain', { exact: true }).click();

	// Assert heading and subheading
	await expect(
		page.getByRole('heading', { name: 'Custom Domain Settings' }),
	).toBeVisible();
	await expect(
		page.getByText('Personalize your workspace domain effortlessly.'),
	).toBeVisible();

	// Assert presence of Customize team’s URL button
	const customizeBtn = page.getByRole('button', {
		name: 'Customize team’s URL',
	});
	await expect(customizeBtn).toBeVisible();
	await customizeBtn.click();

	// Assert modal/dialog fields and buttons
	await expect(
		page.getByRole('dialog', { name: 'Customize your team’s URL' }),
	).toBeVisible();
	await expect(page.getByLabel('Team’s URL subdomain')).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Apply Changes' }),
	).toBeVisible();
	await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
	// Close the modal
	await page.getByRole('button', { name: 'Close' }).click();
});
