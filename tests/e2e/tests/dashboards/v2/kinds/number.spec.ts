import {
	ALL_KINDS_PANELS,
	allKindsDashboard,
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

test.describe('Dashboards V2 — Number panel', () => {
	test('TC-01 the Number panel renders a value, not an empty state', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
			QueryRange.scalar({
				aggregationColumns: ['A'],
				rows: [[1234]],
			}),
		);
		await dashboards.seedAndOpen(allKindsDashboard());

		const target = panels.panel(ALL_KINDS_PANELS.number);
		await target.scrollIntoView();
		await expect(target.renderer(PanelKind.Number)).toBeVisible();
		await expect(target.numberValue()).toBeVisible();
		await expect(target.numberNoData()).toHaveCount(0);
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

	test.describe('comparison thresholds', () => {
		test('TC-03 the comparison variant persists its operator and display mode', async ({
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

		test('TC-04 a crossed threshold colours the rendered value', async ({
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

		test('TC-05 raising the threshold past the value clears the colour live', async ({
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

		test('TC-06 the threshold colour survives save and shows on the dashboard', async ({
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
	});
});
