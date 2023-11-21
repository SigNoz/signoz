import { Page, test, expect } from '@playwright/test';
import { loginApi } from '../fixtures/common';
import ROUTES from 'constants/routes';
import queryRangeSuccessResponse from '../fixtures/api/traces/queryRange200.json';
import tracesSuccessResponse from '../fixtures/api/traces/tracesRange200.json';
import tracesTableSuccessResponse from '../fixtures/api/traces/tracesTableView200.json';
import {
	defaultAttributeKeysData,
	httpMethodAttributeID,
	newExplorerCtaID,
	queryRangeApiEndpoint,
	saveNewViewID,
	saveNewViewWithNameID,
	serviceAttributeID,
	tableViewTabID,
	traceExplorerViewsGetEndpoint,
	traceExplorerViewsPostEndpoint,
	traceRowTraceTabID,
	traceTabID,
	tracesExplorerQueryData,
	tracesExplorerViewsData,
	tracesExplorerViewsPostData,
} from './utils';

let page: Page;

test.describe('New Traces Explorer', () => {
	test.beforeEach(async ({ baseURL, browser }) => {
		const context = await browser.newContext({
			storageState: 'tests/auth.json',
		});
		const newPage = await context.newPage();

		await loginApi(newPage);

		await newPage.goto(`${baseURL}${ROUTES.APPLICATION}`);

		page = newPage;
	});

	test('Traces Explorer Tests', async ({}) => {
		await page.locator(`li[data-menu-id*="/trace"]`).click();

		await tracesExplorerQueryData(page, queryRangeSuccessResponse);

		await defaultAttributeKeysData(page);

		const queryRangeRequest = page.waitForRequest(`**/${queryRangeApiEndpoint}`);

		await page.locator(`data-testid=${newExplorerCtaID}`).click();

		await queryRangeRequest;

		await page.getByText('List View').click();

		const serviceName = await page
			.locator(`data-testid=${serviceAttributeID}`)
			.textContent();

		expect(serviceName).toBe('route');

		const httpMethod = await page
			.locator(`data-testid=${httpMethodAttributeID}`)
			.textContent();

		expect(httpMethod).toBe('GET');

		await tracesExplorerQueryData(page, tracesSuccessResponse);

		await page.locator(`id=${traceTabID}`).click();

		const traceID = await page
			.locator(`data-testid=${traceRowTraceTabID}`)
			.textContent();

		expect(traceID).toBe(
			tracesSuccessResponse.data.result[0].list[0].data.traceID,
		);

		await tracesExplorerQueryData(page, tracesTableSuccessResponse);

		await page.locator(`id=${tableViewTabID}`).click();

		await page.waitForLoadState('networkidle');

		const count = await page.getByText('85784').isVisible();

		await expect(count).toBeTruthy();

		await page.locator(`data-testid=${saveNewViewID}`).click();

		await page.locator('id=viewName').type('Playwright');

		await tracesExplorerQueryData(page, queryRangeSuccessResponse);

		await tracesExplorerViewsData(page);

		await tracesExplorerViewsPostData(page);

		const viewsSaveRequest = page.waitForRequest(
			`**/${traceExplorerViewsPostEndpoint}`,
		);

		const viewsGetRequest = page.waitForRequest(
			`**/${traceExplorerViewsGetEndpoint}`,
		);

		await page.locator(`data-testid=${saveNewViewWithNameID}`).click();

		await viewsSaveRequest;

		await viewsGetRequest;

		const viewName = await page.getByText('Playwright').isVisible();

		await expect(viewName).toBeTruthy();
	});
});
