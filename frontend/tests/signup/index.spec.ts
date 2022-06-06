import { expect, test } from '@playwright/test';
import ROUTES from 'constants/routes';

test('Login Page', async ({ page, baseURL }) => {
	const loginPage = `${baseURL}${ROUTES.LOGIN}`;

	await page.goto(loginPage, {
		waitUntil: 'networkidle',
	});

	const signup = 'Monitor your applications. Find what is causing issues.';

	// Click text=Monitor your applications. Find what is causing issues.
	const el = page.locator(`text=${signup}`);

	expect(el).toBeVisible();
});
