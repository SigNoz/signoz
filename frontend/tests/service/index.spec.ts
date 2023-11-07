import { expect, Page, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import servicesSuccessResponse from '../fixtures/api/services/200.json';
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

	test.only('Services Table Rendered with correct data', async ({ baseURL }) => {
		// visit services page
		await page.goto(`${baseURL}${ROUTES.APPLICATION}`);

		// assert the URL of the services page
		await expect(page).toHaveURL(`${baseURL}${ROUTES.APPLICATION}`);

		// assert the presence of services breadcrumbs
		const breadcrumbServicesText = await page
			.locator('.ant-breadcrumb-link a[href="/services"]')
			.nth(1)
			.textContent();
		await expect(breadcrumbServicesText).toEqual('Services');

		// wait for the services list API to be complete
		await page.route(`**/services`, (route) =>
			route.fulfill({
				status: 200,
				json: servicesSuccessResponse,
			}),
		);

		// expect the services headers to be loaded correctly
		const p99Latency = await page
			.locator(
				`th[aria-label*="this column's title is P99 latency (in ms)"] .ant-table-column-title`,
			)
			.textContent();

		await expect(p99Latency).toEqual('P99 latency (in ms)');
		const errorRate = await page
			.locator(
				`th[aria-label*="this column's title is Error Rate (% of total)"] .ant-table-column-title`,
			)
			.textContent();

		await expect(errorRate).toEqual('Error Rate (% of total)');
		const operationsPerSecond = await page
			.locator(
				`th[aria-label="this column's title is Operations Per Second,this column is sortable"] .ant-table-column-title`,
			)
			.textContent();

		await expect(operationsPerSecond).toEqual('Operations Per Second');
		// expect services to be listed in the table
		await page.locator('a[href="/services/redis"]').isVisible();
	});
});
