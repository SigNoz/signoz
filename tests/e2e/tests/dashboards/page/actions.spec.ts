import {
	COMPACT_PANELS,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	compactDashboard,
	expect,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

// Scope: what the panel ⋮ menu's actions do — new-tab alert, download, and the
// mutating ones reaching the spec — plus the dashboard lock gating them.
//
// Items carry no testid, so everything matches role + visible label.

test.describe('Dashboards — panel actions', () => {
	test('TC-01 Create Alerts opens the alert builder in a new tab', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const popup = panels.nextTab();
		await panels
			.panel(COMPACT_PANELS.timeseries)
			.actions.run(PanelAction.createAlert);
		const alertTab = await popup;
		await expect(alertTab).toHaveURL(/\/alerts\/new/);
		await alertTab.close();
	});

	// Chromium-only: headless Firefox/WebKit don't surface the canvas blob as a
	// Playwright download event. CSV and SVG are unaffected.
	test('TC-02 Download as PNG produces a file', async ({
		dashboards,
		panels,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'headless Firefox/WebKit do not emit a download event for the canvas blob',
		);
		await dashboards.seedAndOpen(compactDashboard());
		const target = panels.panel(COMPACT_PANELS.timeseries);
		await target.scrollIntoView();

		const download = panels.nextDownload();
		await target.actions.download('PNG');
		const file = await download;
		expect(file.suggestedFilename()).toMatch(/\.png$/);
	});

	test('TC-03 Clone adds a second panel and persists it', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const before = await dashboards.get(id);
		const beforeCount = Object.keys(before.spec.panels).length;

		await panels.panel(COMPACT_PANELS.timeseries).actions.run(PanelAction.clone);

		await expect
			.poll(async () => Object.keys((await dashboards.get(id)).spec.panels).length)
			.toBe(beforeCount + 1);
	});

	test('TC-04 Delete panel removes the panel and its layout item', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		const list = panels.panel(COMPACT_PANELS.list);
		await list.actions.run(PanelAction.delete);
		await expect(dashboards.text('Delete panel?')).toBeVisible();
		await dashboards.confirmDelete().click();

		await expect(list.root()).toHaveCount(0);

		// Optimistic: the panel leaves the DOM before the PATCH lands.
		await expect
			.poll(
				async () => (await dashboards.get(id)).spec.panels[COMPACT_PANELS.list],
			)
			.toBeUndefined();

		// The grid item must go too, or a dangling $ref renders an empty tile.
		const after = await dashboards.get(id);
		const refs = after.spec.layouts.flatMap((layout) =>
			layout.spec.items.map((item) => item.content.$ref),
		);
		expect(refs).not.toContain(`#/spec/panels/${COMPACT_PANELS.list}`);
	});

	test('TC-05 Move to section relocates the panel between sections', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		await panels.panel(COMPACT_PANELS.timeseries).actions.moveTo('Tabular');

		const ref = `#/spec/panels/${COMPACT_PANELS.timeseries}`;
		await expect
			.poll(async () => {
				const { spec } = await dashboards.get(id);
				return spec.layouts
					.filter((layout) =>
						layout.spec.items.some((item) => item.content.$ref === ref),
					)
					.map((layout) => layout.spec.display.title);
			})
			.toEqual(['Tabular']);
	});

	// An empty table exports nothing, so the rows are mocked.
	test('TC-06 Download as CSV on a Table panel produces a file', async ({
		dashboards,
		panels,
		queryRange,
	}) => {
		await queryRange.respond(
			QueryRange.scalar({
				groupColumns: ['service.name'],
				aggregationColumns: ['A'],
				rows: [['adservice', 10]],
			}),
		);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.Table }));
		const table = panels.panel(SINGLE_PANEL_ID);
		await table.waitRendered(PanelKind.Table);

		const download = panels.nextDownload();
		await table.actions.download('CSV');
		const file = await download;
		expect(file.suggestedFilename()).toMatch(/\.csv$/);
	});
});
