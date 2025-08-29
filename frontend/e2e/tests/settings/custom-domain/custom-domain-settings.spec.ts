import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test('Custom Domain Settings - View and Interact', async ({ page }) => {
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Focus on the settings page sidenav
	await page.getByTestId('settings-page-sidenav').focus();

	// Click Custom Domain tab in the settings sidebar (by data-testid)
	await page.getByTestId('custom-domain').click();

	// Wait for custom domain chart/data to finish loading
	await page.getByText('loading').first().waitFor({ state: 'hidden' });

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
