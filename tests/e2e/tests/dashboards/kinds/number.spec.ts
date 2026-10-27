import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const VALUE = QueryRange.scalar({
	aggregationColumns: ['A'],
	rows: [[1234]],
});

test.describe('Dashboards — Number panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(VALUE);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.Number }),
		);
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.Number);
	});

	test('TC-01 its menu offers PNG and SVG downloads and Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toBeVisible();
	});

	test('TC-02 clicking the value opens the drilldown menu', async ({
		panels,
	}) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.numberValue()).toBeVisible();
		await target.numberValue().click();
		await expect(panels.drilldown.menu()).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-traces')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
	});
});
