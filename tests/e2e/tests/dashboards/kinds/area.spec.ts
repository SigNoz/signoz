import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	ramp,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
]);

test.describe('Dashboards — Area panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(SERIES);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.AreaChart }),
		);
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.AreaChart);
	});

	test('TC-01 its menu offers PNG and SVG downloads and Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toBeVisible();
	});

	test('TC-02 clicking a point opens the drilldown menu', async ({ panels }) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await target.chart.clickPoint();
		await expect(panels.drilldown.menu()).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-traces')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
	});
});
