import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

// E2E: Billing Settings - View Billing Information and Button Actions

test('View Billing Information and Button Actions', async ({
	page,
	context,
}) => {
	// Ensure user is logged in
	await ensureLoggedIn(page);

	// 1. Open the sidebar settings menu using data-testid
	await page.getByTestId('settings-nav-item').click();

	// 2. Click Account Settings in the dropdown (by role/name or data-testid if available)
	await page.getByRole('menuitem', { name: 'Account Settings' }).click();

	// Assert the main tabpanel/heading (confirmed by DOM)
	await expect(page.getByTestId('settings-page-title')).toBeVisible();

	// Focus on the settings page sidenav
	await page.getByTestId('settings-page-sidenav').focus();

	// Click Billing tab in the settings sidebar (by data-testid)
	await page.getByTestId('billing').click();

	// Wait for billing chart/data to finish loading
	await page.getByText('loading').first().waitFor({ state: 'hidden' });

	// Assert visibility of subheading (unique)
	await expect(
		page.getByText(
			'Manage your billing information, invoices, and monitor costs.',
		),
	).toBeVisible();
	// Assert visibility of Teams Cloud heading
	await expect(page.getByRole('heading', { name: 'Teams Cloud' })).toBeVisible();

	// Assert presence of summary and detailed tables
	await expect(page.getByText('TOTAL SPENT')).toBeVisible();
	await expect(page.getByText('Data Ingested')).toBeVisible();
	await expect(page.getByText('Price per Unit')).toBeVisible();
	await expect(page.getByText('Cost (Billing period to date)')).toBeVisible();

	// Assert presence of alert and note
	await expect(
		page.getByText('Your current billing period is from', { exact: false }),
	).toBeVisible();
	await expect(
		page.getByText('Billing metrics are updated once every 24 hours.'),
	).toBeVisible();

	// Test Download CSV button
	const [download] = await Promise.all([
		page.waitForEvent('download'),
		page.getByRole('button', { name: 'cloud-download Download CSV' }).click(),
	]);
	// Optionally, check download file name
	expect(download.suggestedFilename()).toContain('billing_usage');

	// Test Manage Billing button (opens Stripe in new tab)
	const [newPage] = await Promise.all([
		context.waitForEvent('page'),
		page.getByTestId('header-billing-button').click(),
	]);
	await newPage.waitForLoadState();
	expect(newPage.url()).toContain('stripe.com');
	await newPage.close();
});
