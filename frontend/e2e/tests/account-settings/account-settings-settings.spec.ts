import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('Account Settings - View and Assert Static Controls', async ({ page }) => {
	await ensureLoggedIn(page);

	// Assert 'Settings' is visible in the sidebar (confirmed by DOM)
	await expect(
		page.locator('div.nav-dropdown-item', { hasText: 'Settings' }),
	).toBeVisible();

	// Assert 'Account Settings' is visible in the sidebar (confirmed by DOM)
	await expect(
		page.locator('div.nav-item', { hasText: 'Account Settings' }),
	).toBeVisible();

	// Assert 'Account Settings' is visible in the user menu dropdown (confirmed by DOM)
	// Open user menu (click on user avatar or name in the sidebar header)
	await page.getByText('main-a576982', { exact: true }).click();
	await expect(
		page.getByRole('menuitem', { name: 'Account Settings' }),
	).toBeVisible();
	// Optionally, close the menu by clicking outside or pressing Escape
	await page.keyboard.press('Escape');

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(
		page.getByRole('tabpanel', { name: 'My Settings' }),
	).toBeVisible();

	// Assert General section and controls (confirmed by DOM)
	await expect(page.getByText('General')).toBeVisible();
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
	await expect(page.getByRole('radio', { name: 'Dark' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Light' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'System' })).toBeVisible();
	await expect(
		page.getByRole('switch', { name: 'Adapt to my timezone' }),
	).toBeVisible();
	await expect(
		page.getByRole('switch', { name: 'Keep the primary sidebar always open' }),
	).toBeVisible();
});
