import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from '../utils/login.util';

test('Login page is loading and user logs into the app', async ({ page }) => {
	await page.goto('https://app.us.staging.signoz.cloud');

	// Expect a title "to contain" a substring.
	await expect(page.getByText('Login with SigNoz')).toBeVisible();

	await ensureLoggedIn(page);

	await expect(page).toHaveTitle(/Home/);
});
