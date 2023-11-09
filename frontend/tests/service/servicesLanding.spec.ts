import { expect, Page, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import servicesSuccessResponse from '../fixtures/api/services/200.json';
import { loginApi } from '../fixtures/common';

let page: Page;

test.describe('Service flow', () => {
	test.beforeEach(async ({ baseURL, browser }) => {
		const context = await browser.newContext({ storageState: 'tests/auth.json' });
		const newPage = await context.newPage();

		await loginApi(newPage);

		await newPage.goto(`${baseURL}${ROUTES.APPLICATION}`);

		page = newPage;
	});

	test('Services empty page', async ({ baseURL }) => {
		// visit services page
		await page.goto(`${baseURL}${ROUTES.APPLICATION}`);

		await page.route(`**/services`, (route) =>
			route.fulfill({
				status: 200,
				json: [],
			}),
		);

		// expect noData to be present
		await expect(page.getByText('No data')).toBeVisible();
	});

	test('Services table and service details page rendered with correct data', async ({
		baseURL,
	}) => {
		// visit services page
		await page.goto(`${baseURL}${ROUTES.APPLICATION}`);

		// assert the URL of the services page
		await expect(page).toHaveURL(`${baseURL}${ROUTES.APPLICATION}`);

		// mock the services list call to return non-empty data
		await page.route(`**/services`, (route) =>
			route.fulfill({
				status: 200,
				json: servicesSuccessResponse,
			}),
		);

		// assert the presence of services breadcrumbs
		const breadcrumbServicesText = await page
			.locator('.ant-breadcrumb-link a[href="/services"]')
			.nth(1)
			.textContent();
		await expect(breadcrumbServicesText).toEqual('Services');

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
		const redisService = await page
			.locator('a[href="/services/redis"]')
			.isVisible();

		expect(redisService).toBeTruthy();

		// route to a service details page
		await page.locator('a[href="/services/redis"]').click();

		// wait for the network calls to be settled
		await page.waitForLoadState('networkidle');

		// render the overview tab
		await page.getByRole('tab', { name: 'Overview' }).click();

		// check the presence of different graphs on the overview tab
		const latencyGraph = await page
			.locator('.ant-card-body:has-text("Latency")')
			.isVisible();

		expect(latencyGraph).toBeTruthy();

		const rateOps = await page
			.locator('.ant-card-body:has-text("Rate (ops/s)")')
			.isVisible();

		expect(rateOps).toBeTruthy();

		const errorPercentage = await page
			.locator('.ant-card-body:has-text("Error Percentage")')
			.isVisible();

		expect(errorPercentage).toBeTruthy();

		// navigate to the DB call metrics and validate the tables
		await page.getByRole('tab', { name: 'DB Call Metrics' }).click();

		const databaseCallRps = await page
			.locator('.ant-card-body:has-text("Database Calls RPS")')
			.isVisible();

		expect(databaseCallRps).toBeTruthy();

		const databaseCallsAvgDuration = await page
			.locator('.ant-card-body:has-text("Database Calls Avg Duration")')
			.isVisible();

		expect(databaseCallsAvgDuration).toBeTruthy();

		// navigate to external metrics and validate the tables

		await page.getByRole('tab', { name: 'External Metrics' }).click();
		const externalCallErrorPerc = await page
			.locator('.ant-card-body:has-text("External Call Error Percentage")')
			.isVisible();

		expect(externalCallErrorPerc).toBeTruthy();

		const externalCallDuration = await page
			.locator('#external_call_duration:has-text("External Call duration")')
			.isVisible();

		expect(externalCallDuration).toBeTruthy();

		const externalCallRps = await page
			.locator('.ant-card-body:has-text("External Call RPS(by Address)")')
			.isVisible();

		expect(externalCallRps).toBeTruthy();

		const externalCallDurationByAddress = await page
			.locator(
				'#external_call_duration_by_address:has-text("External Call duration(by Address)")',
			)
			.isVisible();

		expect(externalCallDurationByAddress).toBeTruthy();
	});
});
