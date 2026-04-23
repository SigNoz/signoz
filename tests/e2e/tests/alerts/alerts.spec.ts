import { test, expect } from '../../fixtures/auth';

test('TC-01 alerts page — tabs render', async ({ authedPage: page }) => {
	await page.goto('/alerts');
	await expect(page.getByRole('tab', { name: /alert rules/i })).toBeVisible();
	await expect(page.getByRole('tab', { name: /configuration/i })).toBeVisible();
});
