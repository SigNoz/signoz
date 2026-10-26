import {
	COMPACT_PANELS,
	compactDashboard,
	expect,
	PanelKind,
	PATH,
	QueryRange,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

// Table has no panel-wide `unit`; it carries `columnUnits` per column.

test.describe('Dashboards — Table panel', () => {
	test.describe('rendering', () => {
		test('TC-01 header search filters the table and can be cleared', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await queryRange.respond(
				QueryRange.scalar({
					groupColumns: ['service.name'],
					aggregationColumns: ['A'],
					rows: [
						['adservice', 10],
						['cartservice', 20],
						['frontend', 30],
					],
				}),
			);
			await dashboards.seedAndOpen(compactDashboard());

			const table = panels.panel(COMPACT_PANELS.table);
			await table.waitRendered(PanelKind.Table);

			const rows = table.table.rows();
			await expect(rows).toHaveCount(3);

			await table.search.open('cart');
			await expect(rows).toHaveCount(1);

			await table.search.clear().click();
			await expect(rows).toHaveCount(3);
		});

		test('TC-02 Escape closes the search box', async ({ dashboards, panels }) => {
			await dashboards.seedAndOpen(compactDashboard());

			const table = panels.panel(COMPACT_PANELS.table);
			await table.scrollIntoView();
			await table.search.open('cart');

			await panels.pressEscape();
			await expect(table.search.input()).toHaveCount(0);
		});

		test('TC-03 a resized column persists across a reload', async ({
			dashboards,
			queryRange,
			panels,
		}) => {
			await queryRange.respond(
				QueryRange.scalar({
					groupColumns: ['service.name'],
					aggregationColumns: ['A'],
					rows: [['adservice', 10]],
				}),
			);
			await dashboards.seedAndOpen(
				singlePanelDashboard({ kind: PanelKind.Table }),
			);

			const target = panels.panel(SINGLE_PANEL_ID);
			await expect(target.renderer(PanelKind.Table)).toBeVisible();

			const before = await target.table.headerWidth('service.name');
			expect(before).toBeGreaterThan(0);

			await target.table.resizeColumn('service.name', 120);

			await expect
				.poll(() => target.table.headerWidth('service.name'))
				.toBeGreaterThan(before);

			// Widths persist behind a 400ms debounce; reloading before it flushes drops
			// the write and looks exactly like a persistence bug.
			await expect
				.poll(() => target.table.storedWidth('service.name'))
				.toBeGreaterThan(before);

			const widened = await target.table.headerWidth('service.name');
			await dashboards.reload();
			await expect(target.renderer(PanelKind.Table)).toBeVisible();
			await expect
				.poll(() => target.table.headerWidth('service.name'))
				.toBeCloseTo(widened, -1);
		});
	});

	test.describe('column units', () => {
		test('TC-04 Table offers per-column units instead of a panel-wide unit', async ({
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

		test('TC-05 the column-units editor explains itself before the panel has run', async ({
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

		test('TC-06 a per-column unit persists', async ({
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
	});

	test.describe('table thresholds', () => {
		test('TC-07 a table threshold paints the targeted cell background', async ({
			authedPage: page,
			dashboards,
			editor,
			config,
		}) => {
			// The column key is derived from the live result, so pick it from the
			// dropdown; ">= 0" fires on any non-negative value.
			const id = await dashboards.seedAndEdit(
				singlePanelDashboard({ kind: PanelKind.Table }),
				SINGLE_PANEL_ID,
			);
			await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();

			const valueCell = config.table.valueCell();
			await expect(valueCell).toBeVisible();
			expect(await config.table.background(valueCell)).toBe('');

			await editor.section.expand(Section.thresholds);
			await config.thresholds.addButton('table').click();
			const row = config.thresholds.row('table', 0);
			await row.pickFirstColumn();
			await row.value().fill('0');
			await row.setOperator('above_or_equal');
			await row.setFormat('background');
			await row.save().click();

			// Live in the preview, before saving.
			await expect.poll(() => config.table.background(valueCell)).not.toBe('');

			await editor.save();

			// And on the saved panel back on the dashboard.
			await page.waitForURL(PATH.onDashboard(id));
			const savedCell = config.table.valueCell();
			await expect(savedCell).toBeVisible();
			await expect.poll(() => config.table.background(savedCell)).not.toBe('');
		});

		test('TC-08 the text format colours the value, not the cell', async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(
				singlePanelDashboard({ kind: PanelKind.Table }),
				SINGLE_PANEL_ID,
			);
			await expect(editor.preview.renderer(PanelKind.Table)).toBeVisible();

			const valueCell = config.table.valueCell();
			await expect(valueCell).toBeVisible();

			await editor.section.expand(Section.thresholds);
			await config.thresholds.addButton('table').click();
			const row = config.thresholds.row('table', 0);
			await row.pickFirstColumn();
			await row.value().fill('0');
			await row.setOperator('above_or_equal');
			await row.setFormat('text');
			await row.save().click();

			// Text recolours the value; background paints the cell. Not interchangeable.
			await expect
				.poll(() => config.table.coloredText(valueCell).count())
				.toBeGreaterThan(0);
			expect(await config.table.background(valueCell)).toBe('');
		});
	});
});
