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
} from '../../../drivers/panels';

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
 * TC-03 still runs here: it asserts NO zoom, which stays meaningful.
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

test.describe('Dashboards — panel zoom', () => {
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
			const { x } = await target.chart.scales();
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

	test('TC-02 zooming one panel refetches every panel with the zoomed window', async ({
		dashboards,
		queryRange,
		panels,
		browserName,
	}) => {
		skipDragZoomOnWebkit(browserName);
		await dashboards.seedAndOpen(compactDashboard());
		const ids = Object.values(COMPACT_PANELS);
		for (const id of ids) {
			const target = panels.panel(id);
			await target.scrollIntoView();
			await expect(target.visibility()).toHaveAttribute(
				'data-panel-visible',
				'true',
			);
			await expect(target.loading()).toHaveCount(0);
		}
		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();

		// uPlot's x scale is in seconds; query windows are in ms.
		const { x } = await target.chart.scales();
		const beforeMs = ((x.max ?? 0) - (x.min ?? 0)) * 1000;
		expect(beforeMs).toBeGreaterThan(0);

		const windows = queryRange.recordWindows();
		await target.chart.drag(0.25, 0.75);
		await expect
			.poll(() =>
				Boolean(dashboards.param('startTime') && dashboards.param('endTime')),
			)
			.toBe(true);

		// Zoom updates the global window, so every panel re-queries with a narrower
		// one. A panel may refetch more than once, so panels are counted by their
		// query; the drag covers half the plot, so a zoomed window is well under 80%.
		const zoomedPanels = (): number =>
			new Set(
				windows.filter((w) => w.end - w.start < beforeMs * 0.8).map((w) => w.query),
			).size;
		await expect.poll(zoomedPanels).toBe(ids.length);
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

	test('TC-04 the global Zoom out button widens the visible range again', async ({
		dashboards,
		panels,
		browserName,
	}) => {
		skipDragZoomOnWebkit(browserName);
		await dashboards.seedAndOpen(singlePanelDashboard());
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		const xSpan = async (): Promise<number> => {
			const { x } = await target.chart.scales();
			return (x.max ?? 0) - (x.min ?? 0);
		};
		const before = await xSpan();

		await target.chart.drag(0.35, 0.65);
		await expect.poll(xSpan).toBeLessThan(before * 0.6);
		const zoomed = await xSpan();

		// No per-panel reset — zoom-out is global only.
		const zoomOut = dashboards.zoomOut();
		await expect(zoomOut).toBeVisible();
		await zoomOut.click();

		await expect.poll(xSpan).toBeGreaterThan(zoomed);
	});

	test('TC-05 zooming inside the View modal leaves the dashboard window alone', async ({
		dashboards,
		panels,
		browserName,
	}) => {
		skipDragZoomOnWebkit(browserName);
		await dashboards.seedAndOpen(singlePanelDashboard());

		await panels.view.open(SINGLE_PANEL_ID);
		await expect(panels.view.chart.plotArea()).toBeVisible();
		const xSpan = async (): Promise<number> => {
			const { x } = await panels.view.chart.scales();
			return (x.max ?? 0) - (x.min ?? 0);
		};
		const before = await xSpan();

		await panels.view.chart.drag(0.3, 0.7);
		await expect.poll(xSpan).toBeLessThan(before * 0.6);

		// The modal keeps its own window.
		expect(dashboards.param('startTime')).toBeNull();
		expect(dashboards.param('endTime')).toBeNull();
	});
});
