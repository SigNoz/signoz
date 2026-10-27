import {
	expect,
	logsCountQuery,
	PanelKind,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-editor';

// Scope: switching kind mid-edit — what the session cache restores, and which
// config survives a first-visit transfer. Config only carries when the TARGET
// kind declares that control (buildPluginSpec).

test.describe('Dashboards — panel type switching', () => {
	test('TC-01 switching kind re-renders the preview', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toBeVisible();

		await editor.switchType(PanelKind.Table);
		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toHaveCount(0);
	});

	test('TC-02 switching marks the editor dirty but does not persist', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		await editor.switchType(PanelKind.Number);

		await expect(editor.unsavedBadge()).toBeVisible();
		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			PanelKind.TimeSeries,
		);
	});

	test('TC-03 switching back restores the original kind and its settings from the session cache', async ({
		dashboards,
		editor,
	}) => {
		// Logs, because List rejects metrics; time_series-shaped, because Table
		// can't read `raw`.
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table, query: logsCountQuery() }),
			SINGLE_PANEL_ID,
		);
		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();
		await editor.section.expand(Section.formatting);
		await editor.setTile('decimals', '3');

		// Not the default, so a freshly built Table would not have it.
		await editor.switchType(PanelKind.List);
		await expect(editor.preview.renderer(PanelKind.List)).toBeVisible();

		await editor.switchType(PanelKind.Table);
		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();
		await editor.section.expand(Section.formatting);
		await expect(editor.tileInput('decimals', '3')).toBeChecked();
	});

	test('TC-04 the session cache does not survive a reload', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);
		await editor.switchType(PanelKind.Table);
		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();

		// The cache is a ref on the mounted editor, so a reload drops it. Reload
		// alone — a redundant goto afterwards crashed the page on WebKit.
		await dashboards.reload();
		await expect(editor.root()).toBeVisible();
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toBeVisible();
	});

	test('TC-05 a saved switch persists the new kind', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);
		await editor.switchType(PanelKind.BarChart);
		await editor.save();

		const after = await dashboards.get(id);
		expect(after.spec.panels[SINGLE_PANEL_ID].spec.plugin.kind).toBe(
			PanelKind.BarChart,
		);
	});

	test('TC-06 a panel-wide unit fans out into per-column units on Table', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ pluginSpec: { formatting: { unit: 'ms' } } }),
			SINGLE_PANEL_ID,
		);

		await editor.switchType(PanelKind.Table);
		await editor.save();

		// Table has no panel-wide unit, so it fans out to columns — one-way.
		const after = await dashboards.get(id);
		const formatting =
			after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.formatting;
		expect(formatting?.unit).toBeUndefined();
		expect(Object.values(formatting?.columnUnits ?? {})).toContain('ms');
	});

	test('TC-07 custom legend colours are dropped on a first-visit switch', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({
				pluginSpec: {
					legend: { position: 'bottom', customColors: { adservice: '#ff0000' } },
				},
			}),
			SINGLE_PANEL_ID,
		);

		await editor.switchType(PanelKind.BarChart);
		await editor.save();

		// Keyed by series label, which the new kind may not reproduce, so dropped.
		// Round-trips as null rather than being omitted.
		const after = await dashboards.get(id);
		const { customColors } =
			after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.legend ?? {};
		expect(customColors ?? undefined).toBeUndefined();
	});

	test('TC-08 axis bounds survive a switch between kinds that both declare them', async ({
		dashboards,
		editor,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.axes);
		await editor.control('soft-min').fill('5');
		await editor.control('soft-max').fill('50');

		// Bar Chart also declares minMax, so the bounds must carry over.
		await editor.switchType(PanelKind.BarChart);
		await editor.save();

		const after = await dashboards.get(id);
		const axes = after.spec.panels[SINGLE_PANEL_ID].spec.plugin.spec.axes;
		expect(axes?.softMin).toBe(5);
		expect(axes?.softMax).toBe(50);
	});
});
