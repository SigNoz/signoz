import {
	type Dashboards,
	PanelKind,
	type Panels,
	QUERY_TYPE_PANELS,
	QueryRange,
	type QueryRangeMock,
	SINGLE_PANEL_ID,
	VARIABLE_NAMES,
	VARIABLE_PANEL_ID,
	expect,
	metricsQuery,
	queryTypesDashboard,
	ramp,
	singlePanelDashboard,
	test,
	variablesDashboard,
} from '../../../drivers/panels';

// Scope: the drilldown ContextMenu — dismissal, navigation, variables, and
// the query types deliberately excluded. Mocked so a click lands on a known series.

const ONE_SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
]);

async function openChartDrilldown(
	panels: Panels,
	panelId: string,
): Promise<void> {
	await panels.panel(panelId).chart.clickPoint();
	await expect(panels.drilldown.menu()).toBeVisible();
}

async function seedChartPanel({
	dashboards,
	queryRange,
	panels,
}: {
	dashboards: Dashboards;
	queryRange: QueryRangeMock;
	panels: Panels;
}): Promise<string> {
	await queryRange.respond(ONE_SERIES);
	const id = await dashboards.seedAndOpen(singlePanelDashboard());
	await expect(
		panels.panel(SINGLE_PANEL_ID).renderer(PanelKind.TimeSeries),
	).toBeVisible();
	return id;
}

test.describe('Dashboards — panel drilldown', () => {
	test('TC-01 clicking the backdrop closes the menu', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await seedChartPanel({ dashboards, queryRange, panels });
		await openChartDrilldown(panels, SINGLE_PANEL_ID);

		// Backdrop click. Escape only works when the backdrop holds focus.
		await panels.drilldown.dismiss();
		await expect(panels.drilldown.menu()).toHaveCount(0);
	});

	test('TC-02 View in Logs navigates to the logs explorer', async ({
		authedPage: page,
		dashboards,
		queryRange,
		panels,
	}) => {
		await seedChartPanel({ dashboards, queryRange, panels });
		await openChartDrilldown(panels, SINGLE_PANEL_ID);

		// Disabled while the drilldown query resolves.
		const viewLogs = panels.drilldown.item('drilldown-view-logs');
		await expect(viewLogs).toBeEnabled();

		// safeNavigate uses `{ newTab: true }`, so the dashboard stays put.
		const popup = panels.nextTab();
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

	test('TC-03 Breakout opens a submenu and the back arrow returns', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await seedChartPanel({ dashboards, queryRange, panels });
		await openChartDrilldown(panels, SINGLE_PANEL_ID);

		await panels.drilldown.item('drilldown-breakout').click();
		const back = panels.drilldown.back('breakout');
		await expect(back).toBeVisible();
		await expect(panels.drilldown.breakoutSearch()).toBeVisible();

		// Back returns to the aggregate menu.
		await back.click();
		await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
	});

	test('TC-04 the Dashboard Variables submenu offers set and create', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(ONE_SERIES);
		await dashboards.seedAndOpen(variablesDashboard());
		await expect(
			panels.panel(VARIABLE_PANEL_ID).renderer(PanelKind.TimeSeries),
		).toBeVisible();

		await openChartDrilldown(panels, VARIABLE_PANEL_ID);
		await panels.drilldown.item('drilldown-dashboard-variables').click();

		// `service.name` is grouped-by and already has a variable, so Set is offered.
		await expect(panels.drilldown.item('drilldown-var-set')).toBeVisible();
		await expect(panels.drilldown.back('var')).toBeVisible();
	});

	test('TC-05 setting a variable from the menu updates the variables bar', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(ONE_SERIES);
		await dashboards.seedAndOpen(variablesDashboard());
		await expect(
			panels.panel(VARIABLE_PANEL_ID).renderer(PanelKind.TimeSeries),
		).toBeVisible();

		// Set binds the clicked group-by field, so it targets the dynamic
		// variable on `service.name`; the custom one already defaults to adservice.
		const dynamic = dashboards.variable(VARIABLE_NAMES.dynamic);
		await expect(dynamic).not.toContainText('adservice');

		await openChartDrilldown(panels, VARIABLE_PANEL_ID);
		await panels.drilldown.item('drilldown-dashboard-variables').click();
		await panels.drilldown.item('drilldown-var-set').click();

		await expect(dynamic).toContainText('adservice');
	});

	test('TC-06 creating a variable from the menu patches the dashboard spec', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
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
			panels.panel(VARIABLE_PANEL_ID).renderer(PanelKind.TimeSeries),
		).toBeVisible();

		await openChartDrilldown(panels, VARIABLE_PANEL_ID);
		await panels.drilldown.item('drilldown-dashboard-variables').click();
		await panels.drilldown.item('drilldown-var-create').click();

		// Create persists a DYNAMIC variable into spec.variables.
		await expect
			.poll(async () =>
				(await dashboards.get(id)).spec.variables.some(
					(variable) => variable.spec.name === 'k8s.namespace.name',
				),
			)
			.toBe(true);
	});

	test('TC-07 a non-builder query opens no menu', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(ONE_SERIES);
		await dashboards.seedAndOpen(queryTypesDashboard());

		const promql = panels.panel(QUERY_TYPE_PANELS.promql);
		const builder = panels.panel(QUERY_TYPE_PANELS.builder);
		await expect(promql.renderer(PanelKind.TimeSeries)).toBeVisible();
		await expect(builder.renderer(PanelKind.TimeSeries)).toBeVisible();

		// Gated to QUERY_BUILDER queries. A menu opened by the first click would
		// swallow the second as a backdrop click, so the builder menu proves it.
		await promql.chart.clickPoint();
		await expect(panels.drilldown.menu()).toHaveCount(0);
		await builder.chart.clickPoint();
		await expect(panels.drilldown.menu()).toBeVisible();
	});
});
