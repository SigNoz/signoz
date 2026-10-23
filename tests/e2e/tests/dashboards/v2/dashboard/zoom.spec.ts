import {
	COMPACT_PANELS,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	compactDashboard,
	expect,
	ramp,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panels';

// Scope: brush-select zoom and the window it writes to.
//
// Mocked, not golden-backed: these need a rendered CANVAS to drag across, and a
// query issued before ClickHouse has the re-seeded rows queryable returns empty
// — "No Data", no canvas, intermittent timeout. Nothing here asserts a value.

/**
 * WebKit only, for the tests that need a drag to actually ZOOM.
 *
 * Mid-drag under WebKit the live uPlot instance shows `cursor.left` updating
 * (mousemove arrives) but `cursor.drag._x === false` and `select.width === 0` —
 * the synthetic mousedown never starts a drag. Chromium and Firefox zoom fine,
 * so this looks like input synthesis rather than the app, though unproven.
 * TC-03/TC-05 still run here: they assert NO zoom, which stays meaningful.
 */
function skipDragZoomOnWebkit(browserName: string): void {
	test.skip(
		browserName === 'webkit',
		'WebKit: synthetic mousedown does not start a uPlot drag (cursor.drag._x stays false)',
	);
}

const ZOOM_SERIES = [
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 2, 9) },
];

test.describe('Dashboards V2 — panel zoom', () => {
	test.beforeEach(async ({ queryRange }) => {
		await queryRange.respond(QueryRange.timeSeries(ZOOM_SERIES));
	});

	test('TC-01 brush-select writes an absolute window into the URL', async ({
		dashboards,
		panels,
		browserName,
	}) => {
		skipDragZoomOnWebkit(browserName);
		await dashboards.seedAndOpen(singlePanelDashboard());
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		const xSpan = async (): Promise<number> => {
			const { x } = (await target.chart.state()).scales;
			return (x.max ?? 0) - (x.min ?? 0);
		};
		const before = await xSpan();
		expect(before).toBeGreaterThan(0);

		await target.chart.drag(0.3, 0.7);

		// An absolute range in the URL is what makes the zoom shareable.
		await expect
			.poll(() =>
				Boolean(dashboards.param('startTime') && dashboards.param('endTime')),
			)
			.toBe(true);

		expect(Number(dashboards.param('endTime'))).toBeGreaterThan(
			Number(dashboards.param('startTime')),
		);

		// The chart must actually show the narrower window, not just the URL. The
		// drag covers 40% of the plot, so the visible span shrinks well below 60%.
		await expect.poll(xSpan).toBeLessThan(before * 0.6);
		expect(await xSpan()).toBeGreaterThan(0);
	});

	test('TC-02 zooming one panel refetches every panel on the dashboard', async ({
		dashboards,
		queryRange,
		panels,
		browserName,
	}) => {
		skipDragZoomOnWebkit(browserName);
		await dashboards.seedAndOpen(compactDashboard());
		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();

		// Zoom updates the GLOBAL interval, so siblings must re-query.
		const queries = queryRange.countRequests();

		await target.chart.drag(0.25, 0.75);
		await expect.poll(() => queries.count).toBeGreaterThan(1);
	});

	test('TC-03 a zero-width drag does not zoom', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();

		// A width-0 selection is dropped, so click-to-drilldown never zooms.
		await target.chart.drag(0.5, 0.5);

		expect(dashboards.param('startTime')).toBeNull();
		expect(dashboards.param('endTime')).toBeNull();
	});

	test('TC-04 the global Zoom out button widens the range again', async ({
		dashboards,
		panels,
		browserName,
	}) => {
		skipDragZoomOnWebkit(browserName);
		await dashboards.seedAndOpen(singlePanelDashboard());
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();

		await target.chart.drag(0.35, 0.65);
		await expect.poll(() => dashboards.param('startTime')).not.toBeNull();

		const zoomedStart = Number(dashboards.param('startTime'));

		// No per-panel reset — zoom-out is global only.
		const zoomOut = dashboards.zoomOut();
		await expect(zoomOut).toBeVisible();
		await zoomOut.click();

		await expect
			.poll(() => Number(dashboards.param('startTime')))
			.toBeLessThan(zoomedStart);
	});

	test('TC-05 zooming inside the View modal leaves the dashboard window alone', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(singlePanelDashboard());

		await panels.view.open(SINGLE_PANEL_ID);
		await expect(panels.view.chart.plotArea()).toBeVisible();

		await panels.view.chart.drag(0.3, 0.7);

		// The modal keeps its own window.
		expect(dashboards.param('startTime')).toBeNull();
		expect(dashboards.param('endTime')).toBeNull();
	});
});
