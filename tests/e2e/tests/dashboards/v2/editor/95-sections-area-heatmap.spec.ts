import {
	expect,
	heatmapPoints,
	PanelKind,
	QueryRange,
	ramp,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

// Scope: the ConfigPane sections the Area and Heatmap kinds declare, and that
// their kind-only controls round-trip into the saved spec — Area's stack mode,
// fill and opacity; Heatmap's colour ramp, count range and bucket-axis scale.
// Where the chart reads the setting, the live uPlot instance is checked too.

const AREA_SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
]);

const BUCKETS = [10, 50, 100, 500];

const HEATMAP = QueryRange.heatmap(BUCKETS, [
	{
		labels: { 'service.name': 'adservice' },
		points: heatmapPoints(12, BUCKETS.length + 1),
	},
]);

test.describe('Dashboards V2 — editor sections (Area / Heatmap)', () => {
	test('TC-01 an Area panel declares the time-series sections', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.AreaChart }),
			SINGLE_PANEL_ID,
		);

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
		await expect(editor.section.toggle(Section.buckets)).toHaveCount(0);
	});

	test('TC-02 stack mode reaches the preview and persists', async ({
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

	test('TC-03 Area always fills: no None option, gradient persists', async ({
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

	test('TC-04 fill opacity persists as a 0–1 ratio and sets the fill alpha', async ({
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

	test('TC-05 a Heatmap panel declares no thresholds, links or buckets', async ({
		dashboards,
		queryRange,
		editor,
	}) => {
		await queryRange.respond(HEATMAP);
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
			SINGLE_PANEL_ID,
		);

		for (const title of [
			Section.visualization,
			Section.chartAppearance,
			Section.formatting,
			Section.axes,
			Section.legend,
		]) {
			await expect(editor.section.toggle(title)).toBeVisible();
		}
		// Colour already means "count", and the response fixes the bucket axis.
		for (const title of [
			Section.thresholds,
			Section.contextLinks,
			Section.buckets,
		]) {
			await expect(editor.section.toggle(title)).toHaveCount(0);
		}

		// The axis section carries the bucket scale only, no value bounds.
		await editor.section.expand(Section.axes);
		await expect(editor.control('y-scale')).toBeVisible();
		await expect(editor.control('soft-min')).toHaveCount(0);
		await expect(editor.control('log-scale')).toHaveCount(0);
	});

	test('TC-06 palette and colour scale persist', async ({
		dashboards,
		queryRange,
		editor,
		config,
	}) => {
		await queryRange.respond(HEATMAP);
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.chartAppearance);
		await expect(editor.control('heatmap-preview')).toBeVisible();
		await editor.setTile('heatmap-palette', 'ember');
		await expect(editor.tile('heatmap-palette', 'ember')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await editor.setTile('heatmap-color-scale', 'sqrt');
		await editor.save();

		expect((await config.saved(id)).plugin.chartAppearance?.colors).toMatchObject(
			{ palette: 'ember', scale: 'sqrt' },
		);
	});

	test('TC-07 opacity mode swaps the palette grid for a fill colour', async ({
		dashboards,
		queryRange,
		editor,
		config,
	}) => {
		await queryRange.respond(HEATMAP);
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.chartAppearance);
		await expect(editor.tile('heatmap-palette', 'lava')).toBeVisible();
		await expect(editor.control('heatmap-fill')).toHaveCount(0);

		await editor.setTile('heatmap-color-mode', 'opacity');
		await expect(editor.control('heatmap-fill')).toBeVisible();
		await expect(editor.tile('heatmap-palette', 'lava')).toHaveCount(0);

		await editor.save();
		expect((await config.saved(id)).plugin.chartAppearance?.colors?.mode).toBe(
			'opacity',
		);
	});

	test('TC-08 colour steps and count range persist and reach the colour bar', async ({
		dashboards,
		queryRange,
		editor,
		panels,
		config,
	}) => {
		await queryRange.respond(HEATMAP);
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.chartAppearance);
		await editor.pressSlider('heatmap-color-steps', 'Home');
		await editor.control('heatmap-min-count').fill('5');
		await editor.control('heatmap-max-count').fill('250');
		await editor.save();

		expect((await config.saved(id)).plugin.chartAppearance?.colors).toMatchObject(
			{ steps: 2, minCount: 5, maxCount: 250 },
		);
		const bar = panels.panel(SINGLE_PANEL_ID).heatmap.colorBar();
		await expect(bar).toContainText('5');
		await expect(bar).toContainText('250');
	});

	test('TC-09 the bucket-axis scale persists under axes.y', async ({
		dashboards,
		queryRange,
		editor,
		config,
	}) => {
		await queryRange.respond(HEATMAP);
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Heatmap }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.axes);
		await expect(editor.tile('y-scale', 'auto')).toBeVisible();
		await editor.setTile('y-scale', 'log');
		await editor.save();

		expect((await config.saved(id)).plugin.axes).toEqual({
			y: { scale: 'log' },
		});
	});
});
