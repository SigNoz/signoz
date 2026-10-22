import {
	type Dashboards,
	PanelKind,
	type Panels,
	QueryRange,
	type QueryRangeMock,
	SINGLE_PANEL_ID,
	type SeriesSpec,
	expect,
	ramp,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panels';

// Scope: legend show/hide/solo semantics, legend search, and the tooltip.
//
// Two things shape the assertions:
//  1. Mocked — the golden series set shifts with the rolling window.
//  2. The legend is a virtualized VirtuosoGrid, so only in-view items exist in
//     the DOM; every assertion targets a named series, never a total count.

const SERIES: SeriesSpec[] = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(12, 3, 6) },
	{ labels: { 'service.name': 'frontend' }, points: ramp(12, 5, 2) },
];

async function seedLegendPanel(
	{
		dashboards,
		queryRange,
		panels,
	}: { dashboards: Dashboards; queryRange: QueryRangeMock; panels: Panels },
	legendPosition?: 'bottom' | 'right',
	series: SeriesSpec[] = SERIES,
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

test.describe('Dashboards V2 — legend and tooltip', () => {
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
			.toBe(SERIES.length);
	});

	test('TC-03b clicking the marker toggles just that series off', async ({
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

	test('TC-04 the legend search filters items when positioned right', async ({
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

	test('TC-05 a bottom legend has no search box', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		// A bottom legend only grows a search once its rows overflow; two series
		// fit in the two rows it reserves.
		await seedLegendPanel(
			{ dashboards, queryRange, panels },
			'bottom',
			SERIES.slice(0, 2),
		);
		await expect(panels.panel(SINGLE_PANEL_ID).legend.search()).toHaveCount(0);
	});

	test('TC-06 hovering the chart opens the tooltip', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await seedLegendPanel({ dashboards, queryRange, panels });

		await panels.panel(SINGLE_PANEL_ID).chart.hover();

		await expect(panels.tooltip.container()).toBeVisible();
		await expect(panels.tooltip.list()).toBeVisible();
	});

	test('TC-07 pressing P pins the tooltip and unpins it again', async ({
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
