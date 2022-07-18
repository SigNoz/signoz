import { expect, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import { waitForVersionApiSuccess } from '../fixtures/common';
import { version } from '../fixtures/constant';

test.describe('Login Page', () => {
	test.beforeEach(async ({ baseURL, page }) => {
		const loginPage = `${baseURL}${ROUTES.LOGIN}`;

		await waitForVersionApiSuccess(page);

		await Promise.all([page.goto(loginPage), page.waitForRequest('**/version')]);
	});

	test('Login Page text should be visible', async ({ page }) => {
		const signup = 'Monitor your applications. Find what is causing issues.';

		// Click text=Monitor your applications. Find what is causing issues.
		const el = page.locator(`text=${signup}`);

		expect(el).toBeVisible();
	});

	test('Create an account button should be present', async ({
		page,
		baseURL,
	}) => {
		const loginPage = `${baseURL}${ROUTES.LOGIN}`;

		// find button which has text=Create an account
		const button = page.locator('text=Create an account');

		expect(button).toBeVisible();
		expect(button).toHaveText('Create an account');
		expect(await button.getAttribute('disabled')).toBe(null);

		expect(await button.isEnabled()).toBe(true);
		await expect(page).toHaveURL(loginPage);
	});

	test('Version of the application when api returns 200', async ({ page }) => {
		// Click text=SigNoz ${version}
		const element = page.locator(`text=SigNoz ${version}`);
		element.isVisible();
		const text = await element.innerText();
		expect(text).toBe(`SigNoz ${version}`);
		expect(await page.screenshot()).toMatchSnapshot();
	});
});
