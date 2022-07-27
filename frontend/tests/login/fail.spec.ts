import { expect, test } from '@playwright/test';
import { getVersion } from 'constants/api';
import ROUTES from 'constants/routes';

test.describe('Version API fail while loading login page', async () => {
	test('Something went wrong', async ({ page, baseURL }) => {
		const loginPage = `${baseURL}${ROUTES.LOGIN}`;

		const text = 'Something went wrong';

		await page.route(`**/${getVersion}`, (route) =>
			route.fulfill({
				status: 500,
				body: JSON.stringify({ error: text }),
			}),
		);

		await page.goto(loginPage, {
			waitUntil: 'networkidle',
		});

		const el = page.locator(`text=${text}`);

		expect(el).toBeVisible();
		expect(el).toHaveText(`${text}`);
		expect(await el.getAttribute('disabled')).toBe(null);
		expect(await page.screenshot()).toMatchSnapshot();
	});
});
