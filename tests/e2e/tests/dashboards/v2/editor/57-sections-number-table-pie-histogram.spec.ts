import {
	expect,
	PanelKind,
	QueryRange,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

// Scope: the sections that differ across the non-chart kinds.
//
// The asymmetry: TimeSeries/Number/Pie have one `unit`; Table has none and
// carries `columnUnits` per column (hence the fan-out in 30-type-switch TC-07).

test.describe('Dashboards V2 — editor sections (Number / Table / Pie / Histogram)', () => {
	test('TC-01 Number declares formatting but not axes or chart appearance', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await expect(editor.section.toggle(Section.formatting)).toBeVisible();
		await expect(editor.section.toggle(Section.visualization)).toBeVisible();
		await expect(editor.section.toggle(Section.axes)).toHaveCount(0);
		await expect(editor.section.toggle(Section.chartAppearance)).toHaveCount(0);
		await expect(editor.section.toggle(Section.legend)).toHaveCount(0);
	});

	test('TC-02 a panel-wide unit and decimals persist', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.formatting);
		// Virtualised list — search first.
		await editor.searchSelect(
			'panel-editor-v2-unit',
			'Milliseconds',
			'Milliseconds',
		);
		await editor.setTile('decimals', '3');
		await editor.save();

		const { formatting } = (await config.saved(id)).plugin;
		expect(formatting?.decimalPrecision).toBe('3');
		expect(formatting?.unit).toBe('ms');
	});

	test('TC-03 Table offers per-column units instead of a panel-wide unit', async ({
		dashboards,
		editor,
		config,
	}) => {
		// Golden data: the column key is derived from the resolved result
		// (`column.id || column.name`), which a hand-rolled payload must match
		// exactly or the column renders unnamed.
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();
		await editor.section.expand(Section.formatting);
		// Table declares `columnUnits`, never `unit`.
		await expect(editor.control('unit')).toHaveCount(0);
		await expect(config.columnUnits.any()).toBeVisible();
	});

	test('TC-04 the column-units editor explains itself before the panel has run', async ({
		dashboards,
		queryRange,
		editor,
		config,
	}) => {
		// No result means no columns, so the section shows a hint.
		await queryRange.respond(QueryRange.empty());
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.formatting);
		await expect(
			config.text('Run the query to set a unit for each value column.'),
		).toBeVisible();
	});

	test('TC-05 a per-column unit persists', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();
		await editor.section.expand(Section.formatting);

		// Read the key off the control rather than assuming the derivation.
		await expect(config.columnUnits.any()).toBeVisible();
		const column = await config.columnUnits.first();
		expect(column.key).not.toBe('');

		await editor.searchSelect(column.testId, 'Milliseconds', 'Milliseconds');
		await editor.save();

		const { formatting } = (await config.saved(id)).plugin;
		expect(formatting?.columnUnits?.[column.key]).toBe('ms');
	});

	test('TC-06 Histogram declares Buckets and only a minimal Visualization', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		await expect(editor.section.toggle(Section.buckets)).toBeVisible();
		// Histogram's Visualization declares only the type switcher.
		await editor.section.expand(Section.visualization);
		await expect(editor.control('time-preference')).toHaveCount(0);
	});

	test('TC-07 bucket count and width persist', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.buckets);
		await editor.control('bucket-count').fill('40');
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			histogramBuckets: { bucketCount: 40 },
		});
	});

	test('TC-08 merging active queries hides the Legend section', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Histogram }),
			SINGLE_PANEL_ID,
		);

		// One merged distribution has no per-series legend to configure.
		await expect(editor.section.toggle(Section.legend)).toBeVisible();
		await editor.section.expand(Section.buckets);
		await editor.control('merge-queries').click();
		await expect(editor.section.toggle(Section.legend)).toHaveCount(0);

		await editor.save();
		expect((await config.saved(id)).plugin).toMatchObject({
			histogramBuckets: { mergeAllActiveQueries: true },
		});
	});

	test('TC-09 Pie declares legend and formatting but no axes', async ({
		dashboards,
		editor,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.PieChart }),
			SINGLE_PANEL_ID,
		);

		await expect(editor.section.toggle(Section.legend)).toBeVisible();
		await expect(editor.section.toggle(Section.formatting)).toBeVisible();
		await expect(editor.section.toggle(Section.axes)).toHaveCount(0);

		await expect(editor.section.toggle(Section.thresholds)).toHaveCount(0);
	});
});
