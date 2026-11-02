import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const POINTS = QueryRange.scalar({
	groupColumns: ['service.name'],
	aggregationColumns: ['count()', 'avg(duration_nano)'],
	rows: [
		['adservice', 10, 120],
		['cartservice', 30, 80],
		['checkoutservice', 20, 200],
	],
});

const ONE_VALUE = QueryRange.scalar({
	groupColumns: ['service.name'],
	aggregationColumns: ['count()'],
	rows: [
		['adservice', 10],
		['cartservice', 30],
	],
});

test.describe('Dashboards — Scatter Plot panel', () => {
	test.describe('with an x and a y value', () => {
		test.beforeEach(async ({ dashboards, queryRange, panels }) => {
			await queryRange.respond(POINTS);
			await dashboards.seedAndOpen(
				singlePanelDashboard({ kind: PanelKind.ScatterPlot }),
			);
			await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.ScatterPlot);
		});

		test('TC-01 its menu offers CSV, PNG and SVG downloads but no Create Alerts', async ({
			panels,
		}) => {
			const { actions } = panels.panel(SINGLE_PANEL_ID);

			expect(await actions.downloads()).toEqual(['CSV', 'PNG', 'SVG']);
			await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
		});

		test('TC-02 clicking a point opens the drilldown menu', async ({
			panels,
		}) => {
			await panels.panel(SINGLE_PANEL_ID).scatterPlot.clickPoint();
			await expect(panels.drilldown.menu()).toBeVisible();
			await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
			await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
		});
	});

	test('TC-03 a single value asks for a second one instead of plotting', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(ONE_VALUE);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.ScatterPlot }),
		);
		const { scatterPlot } = panels.panel(SINGLE_PANEL_ID);

		await expect(scatterPlot.emptyMessage()).toBeVisible();
		await expect(scatterPlot.chart()).toHaveCount(0);
	});
});
