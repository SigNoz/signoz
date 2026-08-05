import type { Page } from '@playwright/test';

import { expect, test, type SeedApi } from '../../../../fixtures/dashboards';
import { PanelKind, metricsQuery } from '../../../../helpers/dashboard-v2-spec';
import { getDashboardV2ViaApi } from '../../../../helpers/dashboards-v2';
import {
	boundingBoxOf,
	contextMenu,
	drilldownItem,
	panelChart,
	panelRoot,
} from '../../../../helpers/panels-v2';
import {
	QueryRange,
	mockQueryRange,
	ramp,
} from '../../../../helpers/query-range-mock';
import {
	QUERY_TYPE_PANELS,
	SINGLE_PANEL_ID,
	VARIABLE_NAMES,
	VARIABLE_PANEL_ID,
	queryTypesDashboard,
	singlePanelDashboard,
	variablesDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the drilldown ContextMenu — items, navigation, and the kinds/query
// types deliberately excluded. Mocked so a click lands on a known series.

async function openChartDrilldown(page: Page, panelId: string): Promise<void> {
	const box = await boundingBoxOf(panelChart(page, panelId), 'the chart');
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await expect(contextMenu(page)).toBeVisible();
}

async function seedChartPanel(
	page: Page,
	dashboards: SeedApi,
): Promise<string> {
	await mockQueryRange(
		page,
		QueryRange.timeSeries([
			{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
		]),
	);
	const id = await dashboards.seedAndOpen(singlePanelDashboard());
	await expect(
		panelRoot(page, SINGLE_PANEL_ID).getByTestId('time-series-renderer'),
	).toBeVisible();
	return id;
}

test.describe('Dashboards V2 — panel drilldown', () => {
	test('TC-01 clicking a series opens the aggregate menu', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedChartPanel(page, dashboards);
		await openChartDrilldown(page, SINGLE_PANEL_ID);

		await expect(drilldownItem(page, 'drilldown-view-logs')).toBeVisible();
		await expect(drilldownItem(page, 'drilldown-view-traces')).toBeVisible();
		await expect(drilldownItem(page, 'drilldown-breakout')).toBeVisible();
	});

	test('TC-02 clicking the backdrop closes the menu', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedChartPanel(page, dashboards);
		await openChartDrilldown(page, SINGLE_PANEL_ID);

		// Backdrop click. Escape only works when the backdrop holds focus.
		await page.locator('.context-menu-backdrop').click();
		await expect(contextMenu(page)).toHaveCount(0);
	});

	test('TC-03 View in Logs navigates to the logs explorer', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedChartPanel(page, dashboards);
		await openChartDrilldown(page, SINGLE_PANEL_ID);

		// Disabled while the drilldown query resolves.
		const viewLogs = drilldownItem(page, 'drilldown-view-logs');
		await expect(viewLogs).toBeEnabled();

		// safeNavigate uses `{ newTab: true }`, so the dashboard stays put.
		const popup = page.context().waitForEvent('page');
		await viewLogs.click();
		const logsTab = await popup;

		await logsTab.waitForURL(/\/logs\/logs-explorer/);
		// The clicked series carries across as a composite query.
		expect(
			new URL(logsTab.url()).searchParams.get('compositeQuery'),
		).toBeTruthy();
		await logsTab.close();

		await expect(page).toHaveURL(/\/dashboard\//);
	});

	test('TC-04 Breakout opens a submenu and the back arrow returns', async ({
		authedPage: page,
		dashboards,
	}) => {
		await seedChartPanel(page, dashboards);
		await openChartDrilldown(page, SINGLE_PANEL_ID);

		await drilldownItem(page, 'drilldown-breakout').click();
		const back = page.getByTestId('drilldown-breakout-back');
		await expect(back).toBeVisible();
		await expect(
			page.getByPlaceholder('Search breakout options...'),
		).toBeVisible();

		// Back returns to the aggregate menu.
		await back.click();
		await expect(drilldownItem(page, 'drilldown-view-logs')).toBeVisible();
	});

	test('TC-05 the Dashboard Variables submenu offers set and create', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
			]),
		);
		await dashboards.seedAndOpen(variablesDashboard());
		await expect(
			panelRoot(page, VARIABLE_PANEL_ID).getByTestId('time-series-renderer'),
		).toBeVisible();

		await openChartDrilldown(page, VARIABLE_PANEL_ID);
		await drilldownItem(page, 'drilldown-dashboard-variables').click();

		// `service.name` is grouped-by and already has a variable, so Set is offered.
		await expect(drilldownItem(page, 'drilldown-var-set')).toBeVisible();
		await expect(page.getByTestId('drilldown-var-back')).toBeVisible();
	});

	test('TC-06 setting a variable from the menu updates the variables bar', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
			]),
		);
		await dashboards.seedAndOpen(variablesDashboard());
		await expect(
			panelRoot(page, VARIABLE_PANEL_ID).getByTestId('time-series-renderer'),
		).toBeVisible();

		await openChartDrilldown(page, VARIABLE_PANEL_ID);
		await drilldownItem(page, 'drilldown-dashboard-variables').click();
		await drilldownItem(page, 'drilldown-var-set').click();

		await expect(
			page.getByTestId(`variable-${VARIABLE_NAMES.custom}`),
		).toContainText('adservice');
	});

	test('TC-07 creating a variable from the menu patches the dashboard spec', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.timeSeries([
				{
					labels: { 'k8s.namespace.name': 'signoz-adservice' },
					points: ramp(12, 2, 8),
				},
			]),
		);
		// No matching variable for this field, so the menu offers Create.
		const id = await dashboards.seedAndOpen(
			variablesDashboard(
				undefined,
				metricsQuery({ groupBy: ['k8s.namespace.name'] }),
			),
		);
		await expect(
			panelRoot(page, VARIABLE_PANEL_ID).getByTestId('time-series-renderer'),
		).toBeVisible();

		await openChartDrilldown(page, VARIABLE_PANEL_ID);
		await drilldownItem(page, 'drilldown-dashboard-variables').click();
		await drilldownItem(page, 'drilldown-var-create').click();

		// Create persists a DYNAMIC variable into spec.variables.
		await expect
			.poll(async () => {
				const after = await getDashboardV2ViaApi(page, id);
				return after.spec.variables.some(
					(variable) => variable.spec.name === 'k8s.namespace.name',
				);
			})
			.toBe(true);
	});

	test('TC-08 kinds that do not declare drilldown open no menu', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
			]),
		);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
		);

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await expect(root.getByTestId('histogram-panel-renderer')).toBeVisible();

		// Histogram sets `drilldown: false`.
		const box = await boundingBoxOf(
			root.getByTestId('uplot-main-div'),
			'the histogram chart',
		);
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		await expect(contextMenu(page)).toHaveCount(0);
	});

	test('TC-09 a non-builder query opens no menu', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
			]),
		);
		await dashboards.seedAndOpen(queryTypesDashboard());

		const root = panelRoot(page, QUERY_TYPE_PANELS.promql);
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();

		// Gated to QUERY_BUILDER queries.
		const box = await boundingBoxOf(
			root.getByTestId('uplot-main-div'),
			'the promql chart',
		);
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		await expect(contextMenu(page)).toHaveCount(0);
	});
});
