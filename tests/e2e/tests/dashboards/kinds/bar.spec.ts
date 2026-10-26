import {
	expect,
	PanelKind,
	QueryRange,
	ramp,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

test.describe('Dashboards — Bar panel', () => {
	test('TC-01 Stack series is offered on Bar but Fill gaps is not', async ({
		dashboards,
		editor,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard({ kind: PanelKind.BarChart }),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await expect(editor.control('stacked-bar-chart')).toBeVisible();
		await expect(editor.control('fill-spans')).toHaveCount(0);

		await editor.setTile('stacked-bar-chart', 'stacked');
		await editor.save();
		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { stackedBarChart: true },
		});
	});

	test('TC-02 a threshold draws its line at its value', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
			]),
		);
		await dashboards.seedAndOpen(
			singlePanelDashboard({
				kind: PanelKind.BarChart,
				pluginSpec: { thresholds: [{ value: 45, color: '#ff00ff' }] },
			}),
		);
		const { chart } = panels.panel(SINGLE_PANEL_ID);
		await chart.expectSeriesCount(1);

		await expect
			.poll(() => chart.lineCoverage(45, '#ff00ff'))
			.toBeGreaterThan(0.4);
	});
});
