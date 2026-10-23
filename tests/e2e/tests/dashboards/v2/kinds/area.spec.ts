import {
	expect,
	PanelKind,
	type PanelPluginSpec,
	QueryRange,
	ramp,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	type StackMode,
	test,
	type UPlotState,
} from '../../../../drivers/panel-config';

const AREA_SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
]);

function areaPanel(stack: StackMode): PanelPluginSpec {
	return { visualization: { stack } };
}

function plottedMax(state: UPlotState): number {
	return Math.max(...state.series.map((series) => series.max ?? -Infinity));
}

test.describe('Dashboards V2 — Area panel', () => {
	test.describe('rendering', () => {
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
	});

	test.describe('editor', () => {
		test('TC-04 stack mode reaches the preview and persists', async ({
			dashboards,
			queryRange,
			editor,
			panels,
			config,
		}) => {
			await queryRange.respond(AREA_SERIES);
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({ kind: PanelKind.AreaChart }),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.visualization);
			// Area's three-way stack, not Bar's stacked switch.
			await expect(editor.control('stacked-bar-chart')).toHaveCount(0);
			await expect(editor.tile('stack-mode', 'none')).toBeVisible();
			await expect(editor.tile('stack-mode', 'percent')).toBeVisible();

			await editor.setTile('stack-mode', 'normal');
			await expect
				.poll(async () => (await editor.preview.chart.state()).bandCount)
				.toBe(1);

			await editor.save();
			expect((await config.saved(id)).plugin.visualization?.stack).toBe('normal');
			await expect
				.poll(
					async () => (await panels.panel(SINGLE_PANEL_ID).chart.state()).bandCount,
				)
				.toBe(1);
		});

		test('TC-05 Area always fills: no None option, gradient persists', async ({
			dashboards,
			queryRange,
			editor,
			config,
		}) => {
			await queryRange.respond(AREA_SERIES);
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({ kind: PanelKind.AreaChart }),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.chartAppearance);
			await expect(editor.tile('fill-mode', 'solid')).toBeVisible();
			await expect(editor.tile('fill-mode', 'none')).toHaveCount(0);

			await editor.setTile('fill-mode', 'gradient');
			// A solid fill resolves to a colour string, a gradient to a CanvasGradient.
			await expect
				.poll(async () =>
					(await editor.preview.chart.state()).series.map((s) => s.fill),
				)
				.toEqual(['gradient', 'gradient']);

			await editor.save();
			expect((await config.saved(id)).plugin.chartAppearance?.fillMode).toBe(
				'gradient',
			);
		});

		test('TC-06 fill opacity persists as a 0–1 ratio and sets the fill alpha', async ({
			dashboards,
			queryRange,
			editor,
			config,
		}) => {
			await queryRange.respond(AREA_SERIES);
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({
					kind: PanelKind.AreaChart,
					pluginSpec: { chartAppearance: { fillMode: 'solid' } },
				}),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.chartAppearance);
			await editor.pressSlider('fill-opacity', 'End');
			// `#rrggbb` plus the alpha byte: ff at full opacity.
			await expect
				.poll(async () =>
					(await editor.preview.chart.state()).series.map((s) => s.fill?.slice(-2)),
				)
				.toEqual(['ff', 'ff']);

			await editor.save();
			expect((await config.saved(id)).plugin.chartAppearance?.fillOpacity).toBe(1);
		});
	});
});
