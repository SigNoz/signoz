import {
	type Dashboards,
	expect,
	LOG_DISTR,
	PATH,
	PanelKind,
	type Panels,
	QueryRange,
	type QueryRangeMock,
	ramp,
	Section,
	type SeriesSpec,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

// The legend is a virtualized VirtuosoGrid, so only in-view items exist in the
// DOM; every legend assertion targets a named series, never a total count.
const LEGEND_SERIES: SeriesSpec[] = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(12, 3, 6) },
	{ labels: { 'service.name': 'frontend' }, points: ramp(12, 5, 2) },
];

// A 5-minute series with a 35-minute hole in the middle.
const GAPPED = QueryRange.timeSeries([
	{
		labels: { 'service.name': 'adservice' },
		points: ramp(24, 1, 9).filter((_, i) => i < 10 || i > 15),
	},
]);

/** Magenta: no series palette colour, so only the threshold line can match. */
const THRESHOLD_COLOR = '#ff00ff';

// Pinned so the chart is guaranteed to exist with a known series count.
const SERIES = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
];

async function seedLegendPanel(
	{
		dashboards,
		queryRange,
		panels,
	}: { dashboards: Dashboards; queryRange: QueryRangeMock; panels: Panels },
	legendPosition?: 'bottom' | 'right',
	series: SeriesSpec[] = LEGEND_SERIES,
): Promise<void> {
	await queryRange.respond(QueryRange.timeSeries(series));
	await dashboards.seedAndOpen(
		singlePanelDashboard(
			legendPosition
				? { pluginSpec: { legend: { position: legendPosition } } }
				: {},
		),
	);
	await expect(
		panels.panel(SINGLE_PANEL_ID).renderer(PanelKind.TimeSeries),
	).toBeVisible();
}

test.describe('Dashboards V2 — TimeSeries panel', () => {
	test.describe('legend and tooltip', () => {
		test('TC-01 the legend renders an item per series label', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await seedLegendPanel({ dashboards, queryRange, panels });
			const { legend } = panels.panel(SINGLE_PANEL_ID);

			// Virtualized — assert named series, not a total.
			for (const label of ['adservice', 'cartservice']) {
				await expect(legend.item(label)).toHaveCount(1);
			}
		});

		test('TC-02 clicking an item body solos that series', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await seedLegendPanel({ dashboards, queryRange, panels });
			const { legend, chart } = panels.panel(SINGLE_PANEL_ID);

			// With every series shown, a row click => solo.
			await legend.solo('cartservice');
			await legend.expectShown('adservice', false);
			await legend.expectShown('cartservice', true);

			// Confirm the CHART hid it, not just the legend entry. uPlot labels are the
			// full legend string, so match on the series name inside.
			await expect
				.poll(async () => {
					const { series } = await chart.state();
					return series
						.filter((entry) => entry.show)
						.map((entry) => entry.label ?? '')
						.filter((label) => label.includes('cartservice')).length;
				})
				.toBe(1);
			await expect
				.poll(async () => {
					const { series } = await chart.state();
					return series.filter((entry) => entry.show).length;
				})
				.toBe(1);
		});

		test('TC-03 re-clicking the soloed item restores every series', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await seedLegendPanel({ dashboards, queryRange, panels });
			const { legend, chart } = panels.panel(SINGLE_PANEL_ID);

			await legend.solo('cartservice');
			await legend.expectShown('adservice', false);

			// Clicking the only series shown resets.
			await legend.solo('cartservice');
			await legend.expectShown('adservice', true);
			await expect
				.poll(async () => {
					const { series } = await chart.state();
					return series.filter((entry) => entry.show).length;
				})
				.toBe(LEGEND_SERIES.length);
		});

		test('TC-04 clicking the marker toggles just that series off', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await seedLegendPanel({ dashboards, queryRange, panels });
			const { legend, chart } = panels.panel(SINGLE_PANEL_ID);

			// Marker => per-series toggle, neighbours untouched.
			await legend.toggle('adservice');
			await legend.expectShown('adservice', false);
			await legend.expectShown('cartservice', true);

			// In the chart: exactly the clicked series is hidden.
			await expect
				.poll(async () => {
					const { series } = await chart.state();
					const hidden = series.filter((entry) => !entry.show);
					return {
						count: hidden.length,
						isAdservice: hidden[0]?.label?.includes('adservice') ?? false,
					};
				})
				.toEqual({ count: 1, isAdservice: true });
		});

		test('TC-05 the legend search filters items when positioned right', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			// A right legend always renders its search box.
			await seedLegendPanel({ dashboards, queryRange, panels }, 'right');
			const target = panels.panel(SINGLE_PANEL_ID);
			const search = target.legend.search();
			await expect(search).toBeVisible();

			await search.fill('cart');
			await expect(target.legend.items()).toHaveCount(1);

			await search.fill('nothing-matches-this');
			await expect(target.legend.items()).toHaveCount(0);
			await expect(
				target.text('No series found matching "nothing-matches-this"'),
			).toBeVisible();
		});

		test('TC-06 a bottom legend has no search box', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			// A bottom legend only grows a search once its rows overflow; two series
			// fit in the two rows it reserves.
			await seedLegendPanel(
				{ dashboards, queryRange, panels },
				'bottom',
				LEGEND_SERIES.slice(0, 2),
			);
			await expect(panels.panel(SINGLE_PANEL_ID).legend.search()).toHaveCount(0);
		});

		test('TC-07 hovering the chart opens the tooltip', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await seedLegendPanel({ dashboards, queryRange, panels });

			await panels.panel(SINGLE_PANEL_ID).chart.hover();

			await expect(panels.tooltip.container()).toBeVisible();
			await expect(panels.tooltip.list()).toBeVisible();
		});

		test('TC-08 pressing P pins the tooltip and unpins it again', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await seedLegendPanel({ dashboards, queryRange, panels });
			const { chart } = panels.panel(SINGLE_PANEL_ID);

			await chart.hover();
			await expect(panels.tooltip.container()).toBeVisible();

			await panels.tooltip.pin();
			await expect(panels.tooltip.unpin()).toBeVisible();

			// A pinned tooltip survives the pointer leaving the plot.
			await chart.leave();
			await expect(panels.tooltip.container()).toBeVisible();

			await panels.tooltip.unpin().click();
			await expect(panels.tooltip.unpin()).toHaveCount(0);
		});
	});

	// Each control is checked twice: it round-trips into the saved spec, and the
	// rendered chart honours it (read from the live uPlot instance). The spec alone
	// would pass even if the renderer ignored the setting.
	test.describe('editor sections', () => {
		test('TC-09 sections start collapsed and toggle open', async ({
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

		test('TC-10 axis bounds reach the chart', async ({
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

		test('TC-11 log scale reaches the chart, not just the spec', async ({
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
				.poll(
					async () => (await panels.panel(SINGLE_PANEL_ID).chart.yScale()).distr,
				)
				.toBe(LOG_DISTR);
		});

		test('TC-12 clearing an axis bound stores null, not zero', async ({
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

		test('TC-13 legend position persists', async ({
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

		test('TC-14 chart appearance controls reach the chart', async ({
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

		test('TC-15 the panel time preference persists and drives the header pill', async ({
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

		test('TC-16 Fill gaps is offered on TimeSeries but Stack series is not', async ({
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

		test('TC-17 a section edit marks the editor dirty', async ({
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

	test.describe('label thresholds', () => {
		test('TC-18 adding a threshold and saving persists it', async ({
			dashboards,
			editor,
			config,
		}) => {
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard(),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.thresholds);
			await config.thresholds.addButton('label').click();

			const row = config.thresholds.row('label', 0);
			await row.value().fill('42');
			await row.label().fill('Too high');
			await row.save().click();
			await editor.save();

			const thresholds = await config.savedThresholds(id);
			expect(thresholds).toHaveLength(1);
			expect(thresholds[0]).toMatchObject({ value: 42, label: 'Too high' });
		});

		test('TC-19 the header quick-add expands a collapsed section and adds a row', async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

			// One click must both expand and add (SectionSlot's pendingAction hop).
			await editor.section.collapse(Section.thresholds);
			await config.thresholds.headerAdd().click();

			await expect(editor.section.toggle(Section.thresholds)).toHaveAttribute(
				'aria-expanded',
				'true',
			);
			await expect(config.thresholds.row('label', 0).value()).toBeVisible();
		});

		test('TC-20 only one row is editable at a time', async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

			await editor.section.expand(Section.thresholds);
			await config.thresholds.addButton('label').click();
			const first = config.thresholds.row('label', 0);
			await first.value().fill('10');
			await first.save().click();

			// The first row must fall back to its summary.
			await config.thresholds.addButton('label').click();
			await expect(config.thresholds.row('label', 1).value()).toBeVisible();
			await expect(first.value()).toHaveCount(0);
		});

		test('TC-21 discarding a freshly added row removes it entirely', async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

			await editor.section.expand(Section.thresholds);
			await config.thresholds.addButton('label').click();
			const row = config.thresholds.row('label', 0);
			await row.value().fill('7');

			// Discard on a NEW row deletes it.
			await row.discard().click();
			await expect(row.value()).toHaveCount(0);
			await expect(row.edit()).toHaveCount(0);
		});

		test('TC-22 discarding an existing row restores its previous value', async ({
			dashboards,
			editor,
			config,
		}) => {
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({
					pluginSpec: { thresholds: [{ value: 11, color: 'Red' }] },
				}),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.thresholds);
			const row = config.thresholds.row('label', 0);
			await row.edit().click();
			await row.value().fill('999');

			// Discard on an EXISTING row restores the snapshot.
			await row.discard().click();
			await editor.save();

			const thresholds = await config.savedThresholds(id);
			expect(thresholds).toHaveLength(1);
			expect(thresholds[0].value).toBe(11);
		});

		test('TC-23 a threshold can be removed', async ({
			dashboards,
			editor,
			config,
		}) => {
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({
					pluginSpec: { thresholds: [{ value: 11, color: 'Red' }] },
				}),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.thresholds);
			await config.thresholds.row('label', 0).remove().click();
			await editor.save();

			expect(await config.savedThresholds(id)).toHaveLength(0);
		});
	});

	// Canvas-level behaviour. Gaps are read from the plotted data and the
	// series options; threshold lines are drawn straight onto the canvas by a
	// draw hook, so they are read back from its pixels.
	test.describe('chart drawing', () => {
		test('TC-24 by default a line bridges a gap in the data', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await queryRange.respond(GAPPED);
			await dashboards.seedAndOpen(singlePanelDashboard());

			const [series] = await panels
				.panel(SINGLE_PANEL_ID)
				.chart.state()
				.then((s) => s.series);
			expect(series.spanGaps).toBe(true);
			expect(series.nullCount).toBe(0);
		});

		test('TC-25 a gap threshold below the hole breaks the line, live and saved', async ({
			dashboards,
			queryRange,
			editor,
			panels,
			config,
			authedPage: page,
		}) => {
			await queryRange.respond(GAPPED);
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard(),
				SINGLE_PANEL_ID,
			);

			await editor.section.expand(Section.chartAppearance);
			await editor.setTile('span-gaps', 'threshold');
			await editor.control('span-gaps-value').fill('10m');
			await editor.control('span-gaps-value').press('Enter');

			// uPlot stops bridging and data-prep inserts a null into the hole.
			await expect
				.poll(async () => {
					const [series] = (await editor.preview.chart.state()).series;
					return { spanGaps: series.spanGaps, broken: series.nullCount > 0 };
				})
				.toEqual({ spanGaps: false, broken: true });

			await editor.save();
			expect(
				(await config.saved(id)).plugin.chartAppearance?.spanGaps,
			).toMatchObject({
				fillOnlyBelow: true,
				fillLessThan: '10m',
			});

			await page.waitForURL(PATH.onDashboard(id));
			await expect
				.poll(
					async () =>
						(await panels.panel(SINGLE_PANEL_ID).chart.state()).series[0].nullCount,
				)
				.toBeGreaterThan(0);
		});

		test('TC-26 a gap threshold above the hole keeps the line whole', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await queryRange.respond(GAPPED);
			await dashboards.seedAndOpen(
				singlePanelDashboard({
					pluginSpec: {
						chartAppearance: {
							spanGaps: { fillOnlyBelow: true, fillLessThan: '1h' },
						},
					},
				}),
			);

			const [series] = (await panels.panel(SINGLE_PANEL_ID).chart.state()).series;
			expect(series.nullCount).toBe(0);
		});

		test('TC-27 Fill gaps asks the backend to fill missing points', async ({
			dashboards,
			queryRange,
		}) => {
			const plain = queryRange.nextRequest();
			await dashboards.seedAndOpen(singlePanelDashboard());
			expect((await plain).postDataJSON()?.formatOptions?.fillGaps ?? false).toBe(
				false,
			);

			const filled = queryRange.nextRequest();
			await dashboards.seedAndOpen(
				singlePanelDashboard({
					pluginSpec: { visualization: { fillSpans: true } },
				}),
			);
			expect((await filled).postDataJSON()?.formatOptions?.fillGaps).toBe(true);
		});

		test('TC-28 a threshold draws its line at its value', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await queryRange.respond(QueryRange.timeSeries([SERIES[0]]));
			await dashboards.seedAndOpen(
				singlePanelDashboard({
					pluginSpec: { thresholds: [{ value: 45, color: THRESHOLD_COLOR }] },
				}),
			);
			const { chart } = panels.panel(SINGLE_PANEL_ID);
			await chart.expectSeriesCount(1);

			// Dashed 10/5, so roughly two thirds of the row; elsewhere nothing.
			await expect
				.poll(() => chart.lineCoverage(45, THRESHOLD_COLOR))
				.toBeGreaterThan(0.4);
			expect(await chart.lineCoverage(70, THRESHOLD_COLOR)).toBeLessThan(0.05);
		});

		test('TC-29 removing a threshold erases its line from the preview', async ({
			dashboards,
			queryRange,
			editor,
			config,
		}) => {
			await queryRange.respond(QueryRange.timeSeries([SERIES[0]]));
			await dashboards.seedAndEdit(
				singlePanelDashboard({
					pluginSpec: { thresholds: [{ value: 45, color: THRESHOLD_COLOR }] },
				}),
				SINGLE_PANEL_ID,
			);
			const chart = editor.preview.chart;
			await expect
				.poll(() => chart.lineCoverage(45, THRESHOLD_COLOR))
				.toBeGreaterThan(0.4);

			await editor.section.expand(Section.thresholds);
			await config.thresholds.row('label', 0).remove().click();

			await expect
				.poll(() => chart.lineCoverage(45, THRESHOLD_COLOR))
				.toBeLessThan(0.05);
		});
	});
});
