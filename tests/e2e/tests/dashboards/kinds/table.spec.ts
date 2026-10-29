import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const ROWS = QueryRange.scalar({
	groupColumns: ['service.name'],
	aggregationColumns: ['A'],
	rows: [
		['adservice', 10],
		['cartservice', 20],
	],
});

test.describe('Dashboards — Table panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(ROWS);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.Table }));
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.Table);
	});

	test('TC-01 its menu offers CSV, PNG and SVG downloads but no Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['CSV', 'PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
	});

	test('TC-02 clicking a value cell opens the drilldown menu', async ({
		panels,
	}) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await target.table.rows().first().locator('td').last().click();
		await expect(panels.drilldown.menu()).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-traces')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
	});
});
