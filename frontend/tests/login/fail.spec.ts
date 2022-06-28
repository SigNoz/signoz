import { expect, test } from '@playwright/test';
import { getVersion } from 'constants/api';
import ROUTES from 'constants/routes';

test.describe('Version API fail while loading login page', async () => {
	test('Something went wrong', async ({ page, baseURL }) => {
		const loginPage = `${baseURL}${ROUTES.LOGIN}`;

		await page.route(`**/${getVersion}`, (route) =>
			route.fulfill({
				contentType: 'application/json',
				status: 500,
				body: '',
			}),
		);

		await Promise.all([page.goto(loginPage), page.waitForRequest('**/version')]);

		const el = page.locator(`text=Something went wrong`);

		expect(el).toBeVisible();
		expect(el).toHaveText('Something asdasd wrong');
		expect(await el.getAttribute('disabled')).toBe(null);
	});
});
