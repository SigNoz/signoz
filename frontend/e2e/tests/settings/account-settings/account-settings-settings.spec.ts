import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test('Account Settings - View and Assert Static Controls', async ({ page }) => {
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Assert General section and controls (confirmed by DOM)
	await expect(
		page.getByLabel('My Settings').getByText('General'),
	).toBeVisible();
	await expect(page.getByText('Manage your account settings.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Update name' })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Reset password' }),
	).toBeVisible();

	// Assert User Preferences section and controls (confirmed by DOM)
	await expect(page.getByText('User Preferences')).toBeVisible();
	await expect(
		page.getByText('Tailor the SigNoz console to work according to your needs.'),
	).toBeVisible();
	await expect(page.getByText('Select your theme')).toBeVisible();

	const themeSelector = page.getByTestId('theme-selector');

	await expect(themeSelector.getByText('Dark')).toBeVisible();
	await expect(themeSelector.getByText('Light')).toBeVisible();
	await expect(themeSelector.getByText('System')).toBeVisible();

	await expect(page.getByTestId('timezone-adaptation-switch')).toBeVisible();
	await expect(page.getByTestId('side-nav-pinned-switch')).toBeVisible();
});
