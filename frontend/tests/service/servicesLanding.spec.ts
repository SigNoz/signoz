import { expect, Page, test } from '@playwright/test';
import ROUTES from 'constants/routes';

import servicesSuccessResponse from '../fixtures/api/services/200.json';
import { loginApi } from '../fixtures/common';
import { SERVICE_TABLE_HEADERS } from './utils';

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
		const p99Latency = page.locator(
			`th:has-text("${SERVICE_TABLE_HEADERS.P99LATENCY}")`,
		);

		await expect(p99Latency).toBeVisible();
		const errorRate = await page.locator(
			`th:has-text("${SERVICE_TABLE_HEADERS.ERROR_RATE}")`,
		);

		await expect(errorRate).toBeVisible();
		const operationsPerSecond = await page.locator(
			`th:has-text("${SERVICE_TABLE_HEADERS.OPS_PER_SECOND}")`,
		);

		await expect(operationsPerSecond).toBeVisible();

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
			.locator('[data-testid="service_latency"]')
			.isVisible();

		expect(latencyGraph).toBeTruthy();

		const rateOps = await page
			.locator('[data-testid="operations_per_sec"]')
			.isVisible();

		expect(rateOps).toBeTruthy();

		const errorPercentage = await page
			.locator('[data-testid="error_percentage_%"]')
			.isVisible();

		expect(errorPercentage).toBeTruthy();

		// navigate to the DB call metrics and validate the tables
		await page.getByRole('tab', { name: 'DB Call Metrics' }).click();

		const databaseCallRps = await page
			.locator('[data-testid="database_call_rps"]')
			.isVisible();
		expect(databaseCallRps).toBeTruthy();

		const databaseCallsAvgDuration = await page
			.locator('[data-testid="database_call_avg_duration"]')
			.isVisible();
		expect(databaseCallsAvgDuration).toBeTruthy();

		// navigate to external metrics and validate the tables

		await page.getByRole('tab', { name: 'External Metrics' }).click();

		const externalCallErrorPerc = await page
			.locator('[data-testid="external_call_error_percentage"]')
			.isVisible();
		expect(externalCallErrorPerc).toBeTruthy();

		const externalCallDuration = await page
			.locator('[data-testid="external_call_duration"]')
			.isVisible();
		expect(externalCallDuration).toBeTruthy();

		const externalCallRps = await page
			.locator('[data-testid="external_call_rps_by_address"]')
			.isVisible();
		expect(externalCallRps).toBeTruthy();

		const externalCallDurationByAddress = await page
			.locator('[data-testid="external_call_duration_by_address"]')
			.isVisible();
		expect(externalCallDurationByAddress).toBeTruthy();
	});
});
