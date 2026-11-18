import {
	expect,
	heatmapPoints,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const BUCKETS = [10, 50, 100, 500];

const HEATMAP = QueryRange.heatmap(BUCKETS, [
	{
		labels: { 'service.name': 'adservice' },
		points: heatmapPoints(12, BUCKETS.length + 1),
	},
]);

test.describe('Dashboards — Heatmap panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(HEATMAP);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
		);
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.Heatmap);
	});

	test('TC-01 its menu offers PNG and SVG downloads but no Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
	});

	test('TC-02 clicking a cell opens no drilldown menu', async ({ panels }) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await target.chart.click();
		// The cell tooltip proves the click landed on data.
		await expect(panels.tooltip.heatmap.root()).toBeVisible();
		await expect(panels.drilldown.menu()).toHaveCount(0);
	});
});
