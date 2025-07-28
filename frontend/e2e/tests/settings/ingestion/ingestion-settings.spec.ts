/* eslint-disable sonarjs/no-duplicate-string */
import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../../../utils/login.util';

test.describe('Ingestion Settings', () => {
	test.beforeEach(async ({ page }) => {
		await ensureLoggedIn(page);
	});

	test('View Ingestion Settings Page', async ({ page }) => {
		// 1. Open the sidebar settings menu using data-testid
		await page.getByTestId('settings-nav-item').click();

		// 2. Click Account Settings in the dropdown
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();

		// Assert the main tabpanel/heading
		await expect(page.getByTestId('settings-page-title')).toBeVisible();

		// Focus on the settings page sidenav
		await page.getByTestId('settings-page-sidenav').focus();

		// Click Ingestion tab in the settings sidebar
		await page.getByTestId('ingestion').click();

		// Assert heading and subheading
		await expect(
			page.getByRole('heading', { name: 'Ingestion Keys' }),
		).toBeVisible();
		await expect(
			page.getByText('Create and manage ingestion keys for the SigNoz Cloud'),
		).toBeVisible();

		// Assert presence of search box
		await expect(
			page.getByPlaceholder('Search for ingestion key...'),
		).toBeVisible();

		// Assert presence of New Ingestion key button
		const newBtn = page.getByRole('button', { name: 'New Ingestion key' });
		await expect(newBtn).toBeVisible();

		// Assert Learn more link
		await expect(page.getByRole('link', { name: /Learn more/ })).toBeVisible();
	});

	test('Search Ingestion Keys', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Get the search input
		const searchInput = page.getByPlaceholder('Search for ingestion key...');
		await expect(searchInput).toBeVisible();

		// Enter search text
		await searchInput.fill('test-key');

		// Wait for search to complete (debounced)
		await page.waitForTimeout(600);
	});

	test('Create New Ingestion Key', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Click New Ingestion key button
		await page.getByRole('button', { name: 'New Ingestion key' }).click();

		// Assert modal is visible
		await expect(
			page.getByRole('dialog', { name: 'Create new ingestion key' }),
		).toBeVisible();

		// Fill in the form
		await page
			.getByPlaceholder('Enter Ingestion Key name')
			.fill('test-ingestion-key');

		// Set expiration date (future date)
		await page.locator('.ant-picker-input').click();

		// enter tomorrow date in yyyy-mm-dd format
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const formattedDate = tomorrow.toISOString().split('T')[0];

		await page
			.getByRole('textbox', { name: '* Expiration' })
			.fill(formattedDate, {
				force: true,
			});

		// press enter
		await page.keyboard.press('Enter');

		// Click Create button
		await page.getByRole('button', { name: 'Create new Ingestion key' }).click();

		// Assert success (modal should close and new key should appear)
		await expect(
			page.getByRole('dialog', { name: 'Create new ingestion key' }),
		).not.toBeVisible();
	});

	test('Edit Ingestion Key', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Wait for ingestion keys to load
		await page.waitForSelector('.ingestion-key-container', { timeout: 10000 });

		// if there are no ingestion keys, create a new one
		if (await page.locator('.ant-empty-description').isVisible()) {
			// Click New Ingestion key button
			await page.getByRole('button', { name: 'New Ingestion key' }).click();

			// Assert modal is visible
			await expect(
				page.getByRole('dialog', { name: 'Create new ingestion key' }),
			).toBeVisible();

			// Fill in the form
			await page
				.getByPlaceholder('Enter Ingestion Key name')
				.fill('test-ingestion-key');

			// Set expiration date (future date)
			await page.locator('.ant-picker-input').click();

			// enter tomorrow date in yyyy-mm-dd format
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const formattedDate = tomorrow.toISOString().split('T')[0];

			await page
				.getByRole('textbox', { name: '* Expiration' })
				.fill(formattedDate, {
					force: true,
				});

			// press enter
			await page.keyboard.press('Enter');

			// Click Create button
			await page.getByRole('button', { name: 'Create new Ingestion key' }).click();

			// Assert success (modal should close and new key should appear)
			await expect(
				page.getByRole('dialog', { name: 'Create new ingestion key' }),
			).not.toBeVisible();
		}

		// Click edit button for the first ingestion key
		const editButton = page.locator('.action-btn button').first();
		await editButton.click();

		// Assert edit modal is visible
		await expect(
			page.getByRole('dialog', { name: 'Edit Ingestion Key' }),
		).toBeVisible();

		// Add a new tag
		await page.getByRole('button', { name: 'plus New Tag' }).click();
		await page.getByRole('textbox').nth(2).fill('test');
		await page.getByRole('textbox').nth(2).press('Enter');

		// Update expiration date

		// Set expiration date (future date)
		await page.locator('.ant-picker-input').click();

		// enter tomorrow date in yyyy-mm-dd format
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const formattedDate = tomorrow.toISOString().split('T')[0];

		await page
			.getByRole('textbox', { name: '* Expiration' })
			.fill(formattedDate, {
				force: true,
			});

		// press enter
		await page.keyboard.press('Enter');

		// Click Update button
		await page.getByRole('button', { name: 'Update Ingestion Key' }).click();

		// Assert modal closes
		await expect(
			page.getByRole('dialog', { name: 'Edit Ingestion Key' }),
		).not.toBeVisible();
	});

	test('Copy Ingestion URL and Region', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Wait for ingestion setup details to load
		await page.waitForSelector('.ingestion-setup-details-links', {
			timeout: 10000,
		});

		// Click copy button for ingestion URL
		const urlCopyButton = page.locator('.ingestion-key-url-value');
		await urlCopyButton.click();

		// Assert copy success
		await expect(page.getByText('Copied to clipboard')).toBeVisible();

		// wait for 1 second
		await page.waitForTimeout(5000);

		// Click copy button for region
		const regionCopyButton = page.locator('.ingestion-data-region-value');
		await regionCopyButton.click();

		// Assert copy success
		await expect(page.getByText('Copied to clipboard')).toBeVisible();
	});

	test('Pagination', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Wait for ingestion keys to load
		await page.waitForSelector('.ingestion-key-container', { timeout: 10000 });

		// Check if pagination is present
		const pagination = page.locator('.ant-pagination');
		if (await pagination.isVisible()) {
			// Click next page
			await page.getByRole('button', { name: 'Next' }).click();

			// Assert page changed
			await expect(page.getByText('2-')).toBeVisible();

			// Click previous page
			await page.getByRole('button', { name: 'Previous' }).click();

			// Assert back to first page
			await expect(page.getByText('1-')).toBeVisible();
		}
	});

	test('Form Validation for Create Ingestion Key', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Click New Ingestion key button
		await page.getByRole('button', { name: 'New Ingestion key' }).click();

		// Try to submit without filling required fields
		await page.getByRole('button', { name: 'Create new Ingestion key' }).click();

		// Assert validation errors
		await expect(page.getByText('Please enter Name')).toBeVisible();
		await expect(page.getByText('Please enter Expiration')).toBeVisible();

		// Test invalid name (too short)
		await page.getByPlaceholder('Enter Ingestion Key name').fill('abc');
		await page.getByPlaceholder('Enter Ingestion Key name').blur();
		await expect(
			page.getByText('Name must be at least 6 characters'),
		).toBeVisible();

		// Test invalid name (special characters)
		await page.getByPlaceholder('Enter Ingestion Key name').fill('test@key');
		await page.getByPlaceholder('Enter Ingestion Key name').blur();
		await expect(
			page.getByText(
				'Ingestion key name should only contain letters, numbers, underscores, and hyphens',
			),
		).toBeVisible();

		// Close modal
		await page.getByRole('button', { name: 'Cancel' }).click();
	});

	test('Delete Ingestion Key', async ({ page }) => {
		// Navigate to ingestion settings
		await page.getByTestId('settings-nav-item').click();
		await page.getByRole('menuitem', { name: 'Account Settings' }).click();
		await page.getByTestId('settings-page-sidenav').focus();
		await page.getByTestId('ingestion').click();

		// Wait for ingestion keys to load
		await page.waitForSelector('.ingestion-key-container', { timeout: 10000 });

		// Click delete button for the first ingestion key (second button in action area)
		const deleteButton = page.locator('.action-btn button').nth(1);
		await deleteButton.click();

		// Assert delete confirmation modal is visible
		await expect(
			page.getByRole('dialog', { name: 'Delete Ingestion Key' }),
		).toBeVisible();

		// Confirm deletion
		await page.getByRole('button', { name: 'Delete Ingestion Key' }).click();

		// Assert modal closes
		await expect(
			page.getByRole('dialog', { name: 'Delete Ingestion Key' }),
		).not.toBeVisible();
	});
});
