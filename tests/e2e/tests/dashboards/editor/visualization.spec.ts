import {
	expect,
	PanelKind,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

// Scope: visualization settings that only some kinds declare, saved from the
// editor and read back from the stored spec.

test.describe('Dashboards — editor visualization settings', () => {
	test('TC-01 percent stacking on an Area panel persists', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.AreaChart }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await editor.setTile('stack-mode', 'percent');
		await expect(editor.tileInput('stack-mode', 'percent')).toBeChecked();
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { stack: 'percent' },
		});
	});

	test('TC-02 stacked series on a Bar panel persist', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.BarChart }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await editor.setTile('stacked-bar-chart', 'stacked');
		await expect(editor.tileInput('stacked-bar-chart', 'stacked')).toBeChecked();
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { stackedBarChart: true },
		});
	});
});
