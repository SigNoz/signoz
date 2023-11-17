import { Page, test, expect } from '@playwright/test';
import { loginApi } from '../fixtures/common';
import ROUTES from 'constants/routes';
import dashboardsListEmptyResponse from '../fixtures/api/dashboard/getDashboardListEmpty200.json';
import createNewDashboardPostResponse from '../fixtures/api/dashboard/createNewDashboardPost200.json';
import getIndividualDashboardResponse from '../fixtures/api/dashboard/getIndividualDashboard200.json';
import putNewDashboardResponse from '../fixtures/api/dashboard/putNewDashboardUpdate200.json';
import {
	configureDashboardDescriptonID,
	configureDashboardNameID,
	configureDashboardSettings,
	dashboardDescription,
	dashboardHomePageDesc,
	dashboardHomePageTitle,
	dashboardName,
	dashboardsListAndCreate,
	getDashboardsListEndpoint,
	getIndividualDashboard,
	getIndividualDashboardsEndpoint,
	newDashboardBtnID,
	saveConfigureDashboardID,
} from './utils';

let page: Page;

test.describe('Dashboards Landing Page', () => {
	test.beforeEach(async ({ baseURL, browser }) => {
		const context = await browser.newContext({
			storageState: 'tests/auth.json',
		});
		const newPage = await context.newPage();

		await loginApi(newPage);

		await newPage.goto(`${baseURL}${ROUTES.APPLICATION}`);

		page = newPage;
	});

	test('Create a new dashboard and configure the name and description', async ({}) => {
		// render the dashboards list page with empty response
		await dashboardsListAndCreate(page, dashboardsListEmptyResponse);

		// navigate to the dashboards landing page
		await page.locator(`li[data-menu-id*="/dashboard"]`).click();

		await page.waitForRequest(`**/${getDashboardsListEndpoint}`);

		// without data we should have no data rendering
		const noDataText = await page.getByText('No data');

		await expect(noDataText).toBeVisible();

		// create a new dashboard
		await page.locator(`data-testid=${newDashboardBtnID}`).click();

		await dashboardsListAndCreate(page, createNewDashboardPostResponse);

		await getIndividualDashboard(page, getIndividualDashboardResponse);

		await page.locator(`li[data-menu-id*="Create"]`).click();

		await page.waitForRequest(`**/${getIndividualDashboardsEndpoint}`);

		await page.locator(`data-testid=${configureDashboardSettings}`).click();

		const dashboardNameInput = await page.locator(
			`data-testid=${configureDashboardNameID}`,
		);

		// edit the name of the dashboard
		await dashboardNameInput.fill('');

		await dashboardNameInput.fill(`${dashboardName}`);

		// edit the description of the dashboard
		const dashboardDescInput = await page.locator(
			`data-testid=${configureDashboardDescriptonID}`,
		);
		await dashboardDescInput.fill('');

		await dashboardDescInput.fill(`${dashboardDescription}`);

		await getIndividualDashboard(page, putNewDashboardResponse);

		await page.locator(`data-testid=${saveConfigureDashboardID}`).click();

		await page.locator(`svg[data-icon="close"]`).click();

		// save the configs and check for updated values
		const dashboardTitle = await page
			.locator(`data-testid=${dashboardHomePageTitle}`)
			.textContent();

		expect(dashboardTitle).toBe(`${dashboardName}`);

		const dashboardDesc = await page
			.locator(`data-testid=${dashboardHomePageDesc}`)
			.textContent();

		expect(dashboardDesc).toBe(`${dashboardDescription}`);
	});
});
