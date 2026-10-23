import {
	COMPACT_PANELS,
	PanelKind,
	compactDashboard,
	expect,
	test,
} from '../../../../drivers/panels';

// Scope: grid layout mutations — drag, resize, and the guarantee that the
// header's action cluster never starts a drag.

test.describe('Dashboards V2 — grid layout', () => {
	test('TC-01 resizing a panel persists its new size', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		const before = await dashboards.gridItem(id, COMPACT_PANELS.timeseries);

		await target.grid.resize(60, 90);

		// The grid persists on resize-stop, so the spec is the source of truth
		// rather than the rendered pixel size.
		await expect
			.poll(async () => {
				const after = await dashboards.gridItem(id, COMPACT_PANELS.timeseries);
				return after.height > before.height || after.width > before.width;
			})
			.toBe(true);
	});

	test('TC-02 a resized layout survives a reload', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();

		await target.grid.resize(0, 90);

		await expect
			.poll(
				async () =>
					(await dashboards.gridItem(id, COMPACT_PANELS.timeseries)).height,
			)
			.toBeGreaterThan(6);

		const persisted = await dashboards.gridItem(id, COMPACT_PANELS.timeseries);
		const rendered = await target.grid.size();
		await dashboards.reload();
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		expect(await dashboards.gridItem(id, COMPACT_PANELS.timeseries)).toEqual(
			persisted,
		);
		// The page must lay out from the saved size, not a stale default.
		await expect
			.poll(async () => (await target.grid.size()).height)
			.toBeCloseTo(rendered.height, -1);
	});

	test('TC-03 opening the actions menu does not start a drag', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		const before = await dashboards.gridItem(id, COMPACT_PANELS.timeseries);

		// The ⋮ button sits inside the drag handle but is marked `panel-no-drag`
		// and stops pointerdown, so opening the menu must leave the grid alone.
		await target.actions.open();
		await target.actions.close();

		expect(await dashboards.gridItem(id, COMPACT_PANELS.timeseries)).toEqual(
			before,
		);
	});

	test('TC-04 dragging by the header moves the panel within its section', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		const before = await dashboards.gridItem(id, COMPACT_PANELS.timeseries);

		// A full tile-width right, so the swap is unambiguous.
		await target.grid.dragByHeader();

		await expect
			.poll(async () => {
				const after = await dashboards.gridItem(id, COMPACT_PANELS.timeseries);
				return after.x !== before.x || after.y !== before.y;
			})
			.toBe(true);
	});
});
