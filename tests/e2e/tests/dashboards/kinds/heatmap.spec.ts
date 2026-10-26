import {
	expect,
	heatmapPoints,
	PanelKind,
	QueryRange,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

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

const SINGLE_SERIES_HEATMAP = QueryRange.heatmap(BUCKETS, [
	{
		labels: { 'service.name': 'adservice' },
		points: heatmapPoints(12, BUCKETS.length + 1),
	},
]);

test.describe('Dashboards — Heatmap panel', () => {
	test.describe('rendering', () => {
		test('TC-01 a Heatmap panel draws its grid, colour bar and group legend', async ({
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

		test('TC-02 hovering a cell shows its bucket and count', async ({
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
	});

	test.describe('editor', () => {
		test('TC-03 palette and colour scale persist', async ({
			dashboards,
			queryRange,
			editor,
			config,
		}) => {
			await queryRange.respond(SINGLE_SERIES_HEATMAP);
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

			expect(
				(await config.saved(id)).plugin.chartAppearance?.colors,
			).toMatchObject({ palette: 'ember', scale: 'sqrt' });
		});

		test('TC-04 opacity mode swaps the palette grid for a fill colour', async ({
			dashboards,
			queryRange,
			editor,
			config,
		}) => {
			await queryRange.respond(SINGLE_SERIES_HEATMAP);
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

		test('TC-05 colour steps and count range persist and reach the colour bar', async ({
			dashboards,
			queryRange,
			editor,
			panels,
			config,
		}) => {
			await queryRange.respond(SINGLE_SERIES_HEATMAP);
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({ kind: PanelKind.Heatmap }),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.chartAppearance);
			await editor.pressSlider('heatmap-color-steps', 'Home');
			await editor.control('heatmap-min-count').fill('5');
			await editor.control('heatmap-max-count').fill('250');
			await editor.save();

			expect(
				(await config.saved(id)).plugin.chartAppearance?.colors,
			).toMatchObject({ steps: 2, minCount: 5, maxCount: 250 });
			const bar = panels.panel(SINGLE_PANEL_ID).heatmap.colorBar();
			await expect(bar).toContainText('5');
			await expect(bar).toContainText('250');
		});

		test('TC-06 the bucket-axis scale persists under axes.y', async ({
			dashboards,
			queryRange,
			editor,
			config,
		}) => {
			await queryRange.respond(SINGLE_SERIES_HEATMAP);
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
});
