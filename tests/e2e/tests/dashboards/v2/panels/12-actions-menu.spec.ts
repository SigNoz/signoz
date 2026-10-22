import {
	COMPACT_PANELS,
	PanelAction,
	compactDashboard,
	expect,
	test,
} from '../../../../drivers/panels';

// Scope: the panel ⋮ menu — which items exist per kind, how capability and the
// dashboard lock gate them, and that the mutating ones reach the spec.
//
// Items carry no testid, so everything matches role + visible label.

test.describe('Dashboards V2 — panel actions menu', () => {
	test('TC-01 an editable panel offers the full action set', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const { actions } = panels.panel(COMPACT_PANELS.timeseries);
		await actions.open();

		for (const label of [
			PanelAction.view,
			PanelAction.edit,
			PanelAction.clone,
			PanelAction.download,
			PanelAction.createAlert,
			PanelAction.move,
			PanelAction.delete,
		]) {
			await expect(actions.item(label)).toBeVisible();
		}
	});

	test('TC-02 Download offers CSV only on Table', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		// Table declares `csv: true`; others expose PNG/SVG only.
		const table = panels.panel(COMPACT_PANELS.table).actions;
		await table.open();
		await table.hoverItem(PanelAction.download);
		await expect(table.item(PanelAction.downloadCsv)).toBeVisible();
		await table.close();

		const chart = panels.panel(COMPACT_PANELS.timeseries).actions;
		await chart.open();
		await chart.hoverItem(PanelAction.download);
		await expect(chart.item(PanelAction.downloadPng)).toBeVisible();
		await expect(chart.item(PanelAction.downloadCsv)).toHaveCount(0);
	});

	test('TC-03 Create Alerts is hidden for kinds that do not declare it', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const chart = panels.panel(COMPACT_PANELS.timeseries).actions;
		await chart.open();
		await expect(chart.item(PanelAction.createAlert)).toBeVisible();
		await chart.close();

		for (const panelId of [COMPACT_PANELS.table, COMPACT_PANELS.list]) {
			const { actions } = panels.panel(panelId);
			await actions.open();
			await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
			await actions.close();
		}
	});

	test('TC-04 Create Alerts opens the alert builder in a new tab', async ({
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
	test('TC-05 Download as PNG produces a file', async ({
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

	test('TC-06 Clone adds a second panel and persists it', async ({
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

	test('TC-07 Delete panel removes the panel and its layout item', async ({
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

	test('TC-08 Move to section relocates the panel between sections', async ({
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

	test('TC-09 a locked dashboard disables the mutating actions', async ({
		dashboards,
		panels,
	}) => {
		const id = await dashboards.seed(compactDashboard());
		await dashboards.setLocked(id, true);
		await dashboards.open(id);

		const { actions } = panels.panel(COMPACT_PANELS.timeseries);
		await actions.open();

		// View and Download don't mutate, so they stay available.
		await expect(actions.item(PanelAction.view)).toBeEnabled();

		for (const label of [
			PanelAction.edit,
			PanelAction.clone,
			PanelAction.move,
			PanelAction.delete,
		]) {
			await expect(actions.item(label)).toBeDisabled();
		}
	});
});
