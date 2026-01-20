import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test('View General Settings', async ({ page }) => {
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Focus on the settings page sidenav
	await page.getByTestId('settings-page-sidenav').focus();

	// Click General tab in the settings sidebar (by data-testid)
	await page.getByTestId('general').click();

	// Wait for General tab to be visible
	await page.getByRole('tabpanel', { name: 'General' }).waitFor();

	// Assert visibility of definitive/static elements
	await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Traces' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Logs' })).toBeVisible();
	await expect(page.getByText('Please')).toBeVisible();
	await expect(page.getByRole('link', { name: 'email us' })).toBeVisible();
});
