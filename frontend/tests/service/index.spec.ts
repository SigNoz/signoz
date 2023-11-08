import { expect, Page, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import { loginApi } from '../fixtures/common';

let page: Page;

test.describe('Service Page', () => {
	test.beforeEach(async ({ baseURL, browser }) => {
		const context = await browser.newContext({ storageState: 'tests/auth.json' });
		const newPage = await context.newPage();

		await loginApi(newPage);

		await newPage.goto(`${baseURL}${ROUTES.APPLICATION}`);

		page = newPage;
	});

	test('Serice Page is rendered', async ({ baseURL }) => {
		await expect(page).toHaveURL(`${baseURL}${ROUTES.APPLICATION}`);
		expect(await page.screenshot()).toMatchSnapshot();
	});

	test('Logged In must be true', async () => {
		const { app } = await page.evaluate(() => window.store.getState());

		const { isLoggedIn } = app;

		expect(isLoggedIn).toBe(true);
	});
});
