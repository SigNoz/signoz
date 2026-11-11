import {
	emptyDashboard,
	expect,
	GOLDEN,
	PanelKind,
	PATH,
	QueryRange,
	ramp,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panel-config';

// The one full panel flow. Every other kind is trusted to share its editor,
// save and grid plumbing, so their specs stay thin.

const SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(24, 10, 80) },
	{ labels: { 'service.name': 'cartservice' }, points: ramp(24, 20, 60) },
]);

test.describe('Dashboards — TimeSeries panel', () => {
	test('TC-01 a panel built from the picker saves, renders and survives a reload', async ({
		authedPage: page,
		dashboards,
		queryRange,
		editor,
		newPanel,
		panels,
		config,
	}) => {
		await queryRange.respond(SERIES);
		const id = await dashboards.seed(emptyDashboard());
		await dashboards.openEmpty(id);

		await dashboards.emptyAddPanel().click();
		await newPanel.choose(PanelKind.TimeSeries);
		await editor.title().fill('Calls by service');
		await editor.query.selectMetric(GOLDEN.metrics.calls);
		await editor.query.run();
		await expect(editor.preview.renderer(PanelKind.TimeSeries)).toBeVisible();

		await editor.section.expand(Section.axes);
		await editor.control('soft-max').fill('95');
		await editor.section.expand(Section.legend);
		await editor.setTile('legend-position', 'right');
		await editor.section.expand(Section.thresholds);
		await config.thresholds.addButton().click();
		const row = config.thresholds.row(0);
		await row.value().fill('42');
		await row.label().fill('Too high');
		await row.save().click();
		await editor.save();
		await page.waitForURL(PATH.onDashboard(id));

		const saved = await dashboards.get(id);
		const [panelId] = Object.keys(saved.spec.panels);
		const { plugin } = await config.saved(id, panelId);
		expect(plugin).toMatchObject({
			axes: { softMax: 95 },
			legend: { position: 'right' },
		});
		expect(plugin.thresholds).toEqual([
			expect.objectContaining({ value: 42, label: 'Too high' }),
		]);

		const target = panels.panel(panelId);
		const expectRendered = async (): Promise<void> => {
			await expect(target.title()).toHaveText('Calls by service');
			await target.waitRendered(PanelKind.TimeSeries);
			// Only a right legend always renders its search box.
			await expect(target.legend.search()).toBeVisible();
			await expect(target.legend.item('adservice')).toBeVisible();
		};
		await expectRendered();

		await dashboards.reload();
		await expectRendered();
	});

	test('TC-02 the panel time preference persists and labels the header pill', async ({
		dashboards,
		editor,
		panels,
		config,
	}) => {
		const id = await dashboards.seedAndEdit(
			singlePanelDashboard(),
			SINGLE_PANEL_ID,
		);

		await editor.section.expand(Section.visualization);
		await editor.timePreference('Last 15 min');
		await editor.save();

		expect((await config.saved(id)).plugin).toMatchObject({
			visualization: { timePreference: 'last_15_min' },
		});
		await expect(panels.panel(SINGLE_PANEL_ID).timePreference()).toHaveText(
			'15m',
		);
	});
});
