import { Page } from '@playwright/test';
import { JsonApplicationType } from '../fixtures/constant';

// API endpoints
export const getDashboardsListEndpoint = 'v1/dashboards';

export const getIndividualDashboardsEndpoint = 'v1/dashboards/**';

// element's data-testid's
export const newDashboardBtnID = 'create-new-dashboard';

export const configureDashboardSettings = 'show-drawer';

export const configureDashboardNameID = 'dashboard-name';

export const configureDashboardDescriptonID = 'dashboard-desc';

export const dashboardHomePageTitle = 'dashboard-landing-name';

export const dashboardHomePageDesc = 'dashboard-landing-desc';

export const saveConfigureDashboardID = 'save-dashboard-config';

export const addNewVariableID = 'add-new-variable';

export const dashboardName = 'Playwright Dashboard';

export const dashboardDescription = 'Playwright Dashboard Description';

// mock API calls
export const dashboardsListAndCreate = async (
	page: Page,
	response: any,
): Promise<void> => {
	await page.route(`**/${getDashboardsListEndpoint}`, (route) =>
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: response,
		}),
	);
};

export const getIndividualDashboard = async (
	page: Page,
	response: any,
): Promise<void> => {
	await page.route(`**/${getIndividualDashboardsEndpoint}`, (route) =>
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: response,
		}),
	);
};
