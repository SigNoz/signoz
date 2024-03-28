import { Page } from '@playwright/test';

import { JsonApplicationType } from '../fixtures/constant';

// API endpoints
export const getDashboardsListEndpoint = 'v1/dashboards';

export const getIndividualDashboardsEndpoint = 'v1/dashboards/**';

export const queryRangeApiEndpoint = 'query_range';

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

export const addPanelID = 'add-panel';

export const timeSeriesPanelID = 'graph';

export const valuePanelID = 'value';

export const tablePanelID = 'table';

export const timeSeriesGraphName = 'Time1';

let widgetsId: string;

export const insertWidgetIdInResponse = (widgetID: string): any => ({
	status: 'success',
	data: {
		id: 219,
		uuid: 'd697fddb-a771-4bb4-aa38-810f000ed96a',
		created_at: '2023-11-17T20:44:03.167646604Z',
		created_by: 'vikrant@signoz.io',
		updated_at: '2023-11-17T20:51:23.058536475Z',
		updated_by: 'vikrant@signoz.io',
		data: {
			description: 'Playwright Dashboard T',
			layout: [
				{
					h: 3,
					i: '9fbcf0db-1572-4572-bf6b-0a84dd10ed85',
					w: 6,
					x: 0,
					y: 0,
				},
			],
			version: 'v3',
			name: '',
			tags: [],
			title: 'Playwright Dashboard',
			variables: {},
			widgets: [
				{
					description: '',
					id: widgetID,
					isStacked: false,
					nullZeroValues: '',
					opacity: '',
					panelTypes: 'graph',
					query: {
						builder: {
							queryData: [
								{
									aggregateAttribute: {
										dataType: '',
										id: '------',
										isColumn: false,
										isJSON: false,
										key: '',
										type: '',
									},
									aggregateOperator: 'count',
									dataSource: 'metrics',
									disabled: false,
									expression: 'A',
									filters: {
										items: [],
										op: 'AND',
									},
									groupBy: [],
									having: [],
									legend: '',
									limit: null,
									orderBy: [],
									queryName: 'A',
									reduceTo: 'avg',
									stepInterval: 60,
								},
							],
							queryFormulas: [],
						},
						clickhouse_sql: [
							{
								disabled: false,
								legend: '',
								name: 'A',
								query: '',
							},
						],
						id: '6b4011e4-bcea-497d-81a9-0ee7816b679d',
						promql: [
							{
								disabled: false,
								legend: '',
								name: 'A',
								query: '',
							},
						],
						queryType: 'builder',
					},
					timePreferance: 'GLOBAL_TIME',
					title: '',
				},
			],
		},
		isLocked: 0,
	},
});

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
	response?: any,
	useRequestObject?: boolean,
): Promise<void> => {
	await page.route(`**/${getIndividualDashboardsEndpoint}`, (route, request) => {
		if (useRequestObject && request.method() === 'PUT') {
			widgetsId = request.postDataJSON()?.widgets[0].id;
		}
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: useRequestObject ? insertWidgetIdInResponse(widgetsId) : response,
		});
	});
};

export const getTimeSeriesQueryData = async (
	page: Page,
	response: any,
): Promise<void> => {
	// eslint-disable-next-line sonarjs/no-identical-functions
	await page.route(`**/${queryRangeApiEndpoint}`, (route): any =>
		route.fulfill({
			status: 200,
			contentType: JsonApplicationType,
			json: response,
		}),
	);
};
