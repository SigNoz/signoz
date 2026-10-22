import {
	expect,
	heatmapPoints,
	NEW_KINDS_PANELS,
	newKindsDashboard,
	PanelAction,
	PanelKind,
	type PanelPluginSpec,
	PanelMessageText,
	QueryRange,
	ramp,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	type StackMode,
	test,
	type UPlotState,
} from '../../../../drivers/panels';

// Scope: the Area and Heatmap kinds on the grid — rendering, the settings only
// they read (stack mode, the count colour ramp), their tooltip, states, and the
// actions and drilldown each declares.

const AREA_SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
]);

const BUCKETS = [10, 50, 100, 500];

// Cells hold 1 … 12 × 5: a count for every bucket plus the overflow row.
const HEATMAP = QueryRange.heatmap(BUCKETS, [
	{
		labels: { 'service.name': 'adservice' },
		points: heatmapPoints(12, BUCKETS.length + 1),
	},
	{
		labels: { 'service.name': 'cartservice' },
		points: heatmapPoints(12, BUCKETS.length + 1),
	},
]);

function areaPanel(stack: StackMode): PanelPluginSpec {
	return { visualization: { stack } };
}

function plottedMax(state: UPlotState): number {
	return Math.max(...state.series.map((series) => series.max ?? -Infinity));
}

test.describe('Dashboards V2 — Area and Heatmap panels', () => {
	test('TC-01 an Area panel draws every series filled', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(AREA_SERIES);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.AreaChart }),
		);

		const target = panels.panel(SINGLE_PANEL_ID);
		await target.waitRendered(PanelKind.AreaChart);
		await target.chart.expectSeriesCount(2);

		const { series, bandCount } = await target.chart.state();
		// Area is always filled; Overlap draws no bands between series.
		// Solid by default: a colour string, not a gradient.
		expect(series.map((s) => s.fill?.startsWith('#'))).toEqual([true, true]);
		expect(bandCount).toBe(0);
		expect(plottedMax(await target.chart.state())).toBe(80);
	});

	test('TC-02 Stacked mode stacks the series in the plotted data', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(AREA_SERIES);
		await dashboards.seedAndOpen(
			singlePanelDashboard({
				kind: PanelKind.AreaChart,
				pluginSpec: areaPanel('normal'),
			}),
		);

		const chart = panels.panel(SINGLE_PANEL_ID).chart;
		await chart.expectSeriesCount(2);
		const state = await chart.state();
		expect(state.bandCount).toBe(1);
		// The top series carries the running total: 80 + 60 at the last point.
		expect(plottedMax(state)).toBe(140);
	});

	test('TC-03 100% mode normalises the stack to shares', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(AREA_SERIES);
		await dashboards.seedAndOpen(
			singlePanelDashboard({
				kind: PanelKind.AreaChart,
				pluginSpec: areaPanel('percent'),
			}),
		);

		const chart = panels.panel(SINGLE_PANEL_ID).chart;
		await chart.expectSeriesCount(2);
		const state = await chart.state();
		expect(state.bandCount).toBe(1);
		expect(plottedMax(state)).toBeCloseTo(100, 5);
	});

	test('TC-04 a Heatmap panel draws its grid, colour bar and group legend', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(HEATMAP);
		await dashboards.seedAndOpen(
			singlePanelDashboard({
				kind: PanelKind.Heatmap,
				pluginSpec: {
					chartAppearance: { colors: { minCount: 0, maxCount: 500 } },
				},
			}),
		);

		const target = panels.panel(SINGLE_PANEL_ID);
		await target.waitRendered(PanelKind.Heatmap);
		await expect
			.poll(async () => (await target.chart.state()).pointCount)
			.toBe(12);

		// A pinned count range labels the bar's ends.
		const bar = target.heatmap.colorBar();
		await expect(bar).toBeVisible();
		await expect(bar).toContainText('count');
		await expect(bar).toContainText('0');
		await expect(bar).toContainText('500');

		await expect(target.legend.items()).toHaveCount(2);
		await expect(target.legend.item('adservice')).toBeVisible();
	});

	test('TC-05 hovering a cell shows its bucket and count', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(HEATMAP);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
		);

		const target = panels.panel(SINGLE_PANEL_ID);
		await target.waitRendered(PanelKind.Heatmap);
		await target.chart.hover();

		await expect(panels.tooltip.heatmap.root()).toBeVisible();
		await expect(panels.tooltip.heatmap.bucket()).not.toBeEmpty();
		await expect(panels.tooltip.heatmap.count()).toHaveText(/\d/);
		// The bar marks where the hovered count sits on the ramp.
		await expect(target.heatmap.colorBarMarker()).toBeVisible();

		await target.chart.leave();
		await expect(panels.tooltip.heatmap.root()).toHaveCount(0);
	});

	test('TC-06 an empty result shows No Data for both kinds', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.empty());
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.AreaChart }),
		);
		const area = panels.panel(SINGLE_PANEL_ID);
		await expect(area.noData()).toBeVisible();
		await expect(area.text(PanelMessageText.noDataTitle)).toBeVisible();

		await queryRange.reset();
		// Bucket bounds but no series: the heatmap's own empty body.
		await queryRange.respond(QueryRange.heatmap(BUCKETS, []));
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
		);
		const heatmap = panels.panel(SINGLE_PANEL_ID);
		await expect(heatmap.noData()).toBeVisible();
		await expect(heatmap.heatmap.colorBar()).toHaveCount(0);
	});

	test('TC-07 a failing query shows the error state for both kinds', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.fail('querier exploded');
		await dashboards.seedAndOpen(newKindsDashboard());

		for (const id of [NEW_KINDS_PANELS.area, NEW_KINDS_PANELS.heatmap]) {
			const target = panels.panel(id);
			await target.scrollIntoView();
			await expect(target.error()).toBeVisible();
			await expect(target.text('querier exploded')).toBeVisible();
		}
	});

	test('TC-08 the actions menu follows each kind: images only, alerts on Area', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(AREA_SERIES);
		await dashboards.seedAndOpen(newKindsDashboard());

		const area = panels.panel(NEW_KINDS_PANELS.area).actions;
		await area.open();
		await expect(area.item(PanelAction.view)).toBeVisible();
		await expect(area.item(PanelAction.createAlert)).toBeVisible();
		await area.hoverItem(PanelAction.download);
		await expect(area.item(PanelAction.downloadPng)).toBeVisible();
		await expect(area.item(PanelAction.downloadSvg)).toBeVisible();
		await expect(area.item(PanelAction.downloadCsv)).toHaveCount(0);
		await area.close();

		// A distribution per timestamp has no single value to alert on.
		const heatmap = panels.panel(NEW_KINDS_PANELS.heatmap).actions;
		await heatmap.open();
		await expect(heatmap.item(PanelAction.view)).toBeVisible();
		await expect(heatmap.item(PanelAction.createAlert)).toHaveCount(0);
		await heatmap.hoverItem(PanelAction.download);
		await expect(heatmap.item(PanelAction.downloadPng)).toBeVisible();
		await expect(heatmap.item(PanelAction.downloadSvg)).toBeVisible();
		await expect(heatmap.item(PanelAction.downloadCsv)).toHaveCount(0);
		await heatmap.close();
	});

	test('TC-09 clicking an Area chart opens drilldown; a Heatmap has none', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(AREA_SERIES);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.AreaChart }),
		);
		const area = panels.panel(SINGLE_PANEL_ID);
		await area.chart.expectSeriesCount(2);
		await area.chart.clickPoint();
		await expect(panels.drilldown.menu()).toBeVisible();
		await panels.drilldown.dismiss();

		await queryRange.reset();
		await queryRange.respond(HEATMAP);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
		);
		const heatmap = panels.panel(SINGLE_PANEL_ID);
		await heatmap.waitRendered(PanelKind.Heatmap);
		await heatmap.chart.click();
		await expect(panels.tooltip.heatmap.root()).toBeVisible();
		await expect(panels.drilldown.menu()).toHaveCount(0);
	});
});
