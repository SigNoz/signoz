import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../utils/login.util';

test('Members & SSO Settings - View and Interact', async ({ page }) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// Open settings menu via cog icon
	await page.locator('svg.lucide-cog').first().click();
	// Click Workspace Settings in the menu
	await page.getByRole('menuitem', { name: 'Workspace Settings' }).click();
	// Click Members & SSO tab in the sidebar
	await page.getByText('Members & SSO').click();

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
