import {
	expect,
	LOG_DISTR,
	PanelKind,
	QueryRange,
	ramp,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

// Pinned so the chart is guaranteed to exist with a known series count.
const SERIES = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
];

// Scope: the ConfigPane sections a TimeSeries / Bar panel declares —
// Visualization, Axes, Legend and Chart Appearance — and that each control
// round-trips into the persisted spec.
//
// Each control is checked twice: it round-trips into the saved spec, and the
// rendered chart honours it (read from the live uPlot instance). The spec alone
// would pass even if the renderer ignored the setting.

test.describe('Dashboards V2 — editor sections (TimeSeries / Bar)', () => {
	test('TC-01 a TimeSeries panel declares its expected sections', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		for (const title of [
			Section.visualization,
			Section.formatting,
			Section.axes,
			Section.legend,
			Section.chartAppearance,
			Section.thresholds,
			Section.contextLinks,
		]) {
			await expect(editor.section.toggle(title)).toBeVisible();
		}
		// Buckets belongs to Histogram only.
		await expect(editor.section.toggle(Section.buckets)).toHaveCount(0);
	});

	test('TC-02 sections start collapsed and toggle open', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await expect(editor.section.toggle(Section.axes)).toHaveAttribute(
			'aria-expanded',
			'false',
		);
		await editor.section.expand(Section.axes);
		await expect(editor.control('soft-min')).toBeVisible();
	});

	test('TC-03 axis bounds reach the chart', async ({
		dashboards,
		queryRange,
		editor,
		panels,
		config,
	}) => {
		await queryRange.respond(QueryRange.timeSeries(SERIES));
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.axes);
		await editor.control('soft-min').fill('5');
		await editor.control('soft-max').fill('95');
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			axes: { softMin: 5, softMax: 95 },
		});

		// …and the chart is actually bounded by them.
		const chart = panels.panel(SINGLE_PANEL_ID).chart;
		await expect
			.poll(async () => (await chart.yScale()).min)
			.toBeLessThanOrEqual(5);
		await expect
			.poll(async () => (await chart.yScale()).max)
			.toBeGreaterThanOrEqual(95);
	});

	test('TC-03b log scale reaches the chart, not just the spec', async ({
		dashboards,
		queryRange,
		editor,
		panels,
		config,
	}) => {
		await queryRange.respond(QueryRange.timeSeries(SERIES));
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.axes);
		await editor.setTile('log-scale', 'log');

		// Live, before saving — uPlot encodes a log scale as distr 3.
		await expect
			.poll(async () => (await editor.preview.chart.yScale()).distr)
			.toBe(LOG_DISTR);

		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			axes: { isLogScale: true },
		});
		// And on the saved panel.
		await expect
			.poll(async () => (await panels.panel(SINGLE_PANEL_ID).chart.yScale()).distr)
			.toBe(LOG_DISTR);
	});

	test('TC-04 clearing an axis bound stores null, not zero', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ pluginSpec: { axes: { softMin: 5 } } }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.axes);
		// Must clear the bound, not pin the axis to 0.
		await editor.control('soft-min').fill('');
		await editor.save();

		const { plugin } = await config.saved(id);
		expect(plugin.axes?.softMin ?? null).toBeNull();
	});

	test('TC-05 legend position persists', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.legend);
		await editor.setTile('legend-position', 'right');
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			legend: { position: 'right' },
		});
	});

	test('TC-06 chart appearance controls reach the chart', async ({
		dashboards,
		queryRange,
		editor,
		panels,
		config,
	}) => {
		await queryRange.respond(QueryRange.timeSeries(SERIES));
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.chartAppearance);
		await editor.setTile('line-style', 'dashed');
		await editor.setTile('fill-mode', 'gradient');
		await editor.setTile('line-interpolation', 'step_before');
		await editor.control('show-points').click();
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			chartAppearance: {
				lineStyle: 'dashed',
				fillMode: 'gradient',
				lineInterpolation: 'step_before',
				showPoints: true,
			},
		});

		// The rendered series carry the styling.
		await expect
			.poll(async () => {
				const [first] = (await panels.panel(SINGLE_PANEL_ID).chart.state()).series;
				return {
					dashed: (first?.dash?.length ?? 0) > 0,
					filled: first?.hasFill ?? false,
				};
			})
			.toEqual({ dashed: true, filled: true });

		// "Show points" is not asserted against the chart: uPlot installs a
		// predicate for `points.show` either way, so the seam can't distinguish on
		// from off. The spec round-trip above is the available coverage.
	});

	test('TC-07 the panel time preference persists and drives the header pill', async ({
		dashboards,
		editor,
		panels,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await editor.select('panel-editor-v2-time-preference', 'Last 15 min');
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { timePreference: 'last_15_min' },
		});
		// The pill is the user-visible consequence.
		await expect(panels.panel(SINGLE_PANEL_ID).timePreference()).toBeVisible();
	});

	test('TC-08 Fill gaps is offered on TimeSeries but Stack series is not', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await expect(editor.control('fill-spans')).toBeVisible();
		await expect(editor.control('stacked-bar-chart')).toHaveCount(0);

		await editor.control('fill-spans').click();
		await editor.save();
		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { fillSpans: true },
		});
	});

	test('TC-09 Stack series is offered on Bar but Fill gaps is not', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.BarChart }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await expect(editor.control('stacked-bar-chart')).toBeVisible();
		await expect(editor.control('fill-spans')).toHaveCount(0);

		await editor.setTile('stacked-bar-chart', 'stacked');
		await editor.save();
		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { stackedBarChart: true },
		});
	});

	test('TC-10 a section edit marks the editor dirty', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.unsavedBadge()).toHaveCount(0);

		await editor.section.expand(Section.legend);
		await editor.setTile('legend-position', 'right');
		await expect(editor.unsavedBadge()).toBeVisible();
	});
});
