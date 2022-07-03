import { expect, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import { loginApi } from '../fixtures/common';

test.describe('Service Page', () => {
	test('', async ({ browser, baseURL }) => {
		const context = await browser.newContext({ storageState: 'tests/auth.json' });
		const page = await context.newPage();

		await loginApi(page);

		await page.goto(`${baseURL}${ROUTES.APPLICATION}`);

		await expect(page).toHaveURL(`${baseURL}${ROUTES.APPLICATION}`);
	});
});
