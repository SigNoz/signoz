import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const SHARES = QueryRange.scalar({
	groupColumns: ['service.name'],
	aggregationColumns: ['A'],
	rows: [
		['adservice', 10],
		['cartservice', 20],
	],
});

test.describe('Dashboards — Pie panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(SHARES);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.PieChart }),
		);
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.PieChart);
	});

	test('TC-01 its menu offers PNG and SVG downloads but no Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
	});

	test('TC-02 clicking a slice opens the drilldown menu', async ({ panels }) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await target.pie.clickSlice();
		await expect(panels.drilldown.menu()).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-traces')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
	});
});
