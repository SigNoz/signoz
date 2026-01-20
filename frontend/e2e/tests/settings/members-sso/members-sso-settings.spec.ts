import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test('Members & SSO Settings - View and Interact', async ({ page }) => {
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Focus on the settings page sidenav
	await page.getByTestId('settings-page-sidenav').focus();

	// Click Members & SSO tab in the settings sidebar (by data-testid)
	await page.getByTestId('members-sso').click();

	// Assert headings and tables
	await expect(
		page.getByRole('heading', { name: /Members \(\d+\)/ }),
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: /Pending Invites \(\d+\)/ }),
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Authenticated Domains' }),
	).toBeVisible();

	// Assert Invite Members button is visible and clickable
	const inviteBtn = page.getByRole('button', { name: /Invite Members/ });
	await expect(inviteBtn).toBeVisible();
	await inviteBtn.click();
	// Assert Invite Members modal/dialog appears (modal title is unique)
	await expect(page.getByText('Invite team members').first()).toBeVisible();
	// Close the modal (use unique 'Close' button)
	await page.getByRole('button', { name: 'Close' }).click();

	// Assert Edit and Delete buttons are present for at least one member
	const editBtn = page.getByRole('button', { name: /Edit/ }).first();
	const deleteBtn = page.getByRole('button', { name: /Delete/ }).first();
	await expect(editBtn).toBeVisible();
	await expect(deleteBtn).toBeVisible();

	// Assert Add Domains button is visible
	await expect(page.getByRole('button', { name: /Add Domains/ })).toBeVisible();
	// Assert Configure SSO or Edit Google Auth button is visible for at least one domain
	const ssoBtn = page
		.getByRole('button', { name: /Configure SSO|Edit Google Auth/ })
		.first();
	await expect(ssoBtn).toBeVisible();
});
