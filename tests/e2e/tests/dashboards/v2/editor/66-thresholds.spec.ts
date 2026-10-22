import {
	expect,
	PanelKind,
	PATH,
	QueryRange,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-config';

/** A Number panel whose value is pinned, so threshold crossings are exact. */
const PINNED_VALUE = 100;
const PINNED_NUMBER = QueryRange.scalar({
	aggregationColumns: ['A'],
	rows: [[PINNED_VALUE]],
});

// Scope: the Thresholds section across its three variants, and the row
// lifecycle.
//
// Variant follows panel kind, not a user control: label → TimeSeries/Bar,
// comparison → Number, table → Table. The add button's testid varies with it.

test.describe('Dashboards V2 — editor thresholds', () => {
	test('TC-01 a TimeSeries panel gets the label variant', async ({
		dashboards,
		editor,
		config,
	}) => {
		await dashboards.seedAndEdit(singlePanelDashboard(), SINGLE_PANEL_ID);

		await editor.section.expand(Section.thresholds);
		await expect(config.thresholds.addButton('label')).toBeVisible();
		await expect(config.thresholds.addButton('comparison')).toHaveCount(0);
		await expect(config.thresholds.addButton('table')).toHaveCount(0);
	});

	test('TC-02 a Number panel gets the comparison variant', async ({
		dashboards,
		editor,
		config,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.thresholds);
		await expect(config.thresholds.addButton('comparison')).toBeVisible();
		await expect(config.thresholds.addButton('label')).toHaveCount(0);
	});

	test('TC-03 a Table panel gets the table variant', async ({
		dashboards,
		editor,
		config,
	}) => {
		await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Table }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.thresholds);
		await expect(config.thresholds.addButton('table')).toBeVisible();
		await expect(config.thresholds.addButton('label')).toHaveCount(0);
	});

	test('TC-04 adding a threshold and saving persists it', async ({
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

	test('TC-05 the header quick-add expands a collapsed section and adds a row', async ({
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

	test('TC-06 only one row is editable at a time', async ({
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

	test('TC-07 discarding a freshly added row removes it entirely', async ({
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

	test('TC-08 discarding an existing row restores its previous value', async ({
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

	test('TC-09 a threshold can be removed', async ({
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

	test('TC-11 a crossed threshold colours the rendered value', async ({
		dashboards,
		queryRange,
		config,
	}) => {
		// A renderer ignoring `thresholds` would still save the right JSON, so
		// assert the PANEL: value pinned at 100, threshold fires above 50.
		await queryRange.respond(PINNED_NUMBER);
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.Number,
				pluginSpec: {
					thresholds: [
						{
							value: 50,
							color: 'Red',
							operator: 'above',
							format: 'text',
						},
					],
				},
			}),
			SINGLE_PANEL_ID,
		);

		await expect(config.numberValue()).toBeVisible();
		await expect.poll(() => config.numberValueColor()).not.toBe('');
	});

	test('TC-12 raising the threshold past the value clears the colour live', async ({
		dashboards,
		queryRange,
		editor,
		config,
	}) => {
		await queryRange.respond(PINNED_NUMBER);
		await dashboards.seedAndEdit(
			singlePanelDashboard({
				kind: PanelKind.Number,
				pluginSpec: {
					thresholds: [
						{ value: 50, color: 'Red', operator: 'above', format: 'text' },
					],
				},
			}),
			SINGLE_PANEL_ID,
		);
		await expect.poll(() => config.numberValueColor()).not.toBe('');

		// Edits stream into the preview as you type — no Run, no Save.
		await editor.section.expand(Section.thresholds);
		const row = config.thresholds.row('comparison', 0);
		await row.edit().click();
		await row.value().fill('500');

		await expect.poll(() => config.numberValueColor()).toBe('');
	});

	test('TC-13 the threshold colour survives save and shows on the dashboard', async ({
		authedPage: page,
		dashboards,
		queryRange,
		editor,
		config,
	}) => {
		await queryRange.respond(PINNED_NUMBER);
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.thresholds);
		await config.thresholds.addButton('comparison').click();
		const row = config.thresholds.row('comparison', 0);
		await row.value().fill('50');
		await row.setOperator('above');
		await row.save().click();
		await editor.save();

		// End-to-end: the saved panel on the dashboard renders the colour.
		await page.waitForURL(PATH.onDashboard(id));
		await expect(config.numberValue()).toBeVisible();
		await expect.poll(() => config.numberValueColor()).not.toBe('');
	});

	test('TC-14 a table threshold paints the targeted cell background', async ({
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

	test('TC-15 the text format colours the value, not the cell', async ({
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

	test('TC-10 the comparison variant persists its operator and display mode', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.Number }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.thresholds);
		await config.thresholds.addButton('comparison').click();

		const row = config.thresholds.row('comparison', 0);
		await row.value().fill('5');
		await row.setOperator('below');
		await row.setFormat('background');
		await row.save().click();
		await editor.save();

		expect((await config.savedThresholds(id))[0]).toMatchObject({
			value: 5,
			operator: 'below',
			format: 'background',
		});
	});
});
