import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const RANKED = QueryRange.scalar({
	groupColumns: ['service.name'],
	aggregationColumns: ['A'],
	rows: [
		['adservice', 10],
		['cartservice', 30],
		['checkoutservice', 20],
	],
});

test.describe('Dashboards — Top List panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(RANKED);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.TopList }),
		);
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.TopList);
	});

	test('TC-01 its menu offers CSV, PNG and SVG downloads but no Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['CSV', 'PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
	});

	test('TC-02 clicking a row opens the drilldown menu', async ({ panels }) => {
		await panels.panel(SINGLE_PANEL_ID).topList.clickRow(0);
		await expect(panels.drilldown.menu()).toBeVisible();
		await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
		await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
	});

	test('TC-03 ranks rows highest first', async ({ panels }) => {
		const { topList } = panels.panel(SINGLE_PANEL_ID);

		await expect(topList.rows()).toHaveCount(3);
		const labels = (await topList.rowNames()).map((name) => name.split(':')[0]);
		expect(labels).toEqual(['cartservice', 'checkoutservice', 'adservice']);
	});
});
