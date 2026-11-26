import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const LOGS = QueryRange.raw(
	Array.from({ length: 3 }, (_, i) => ({
		timestamp: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
		body: `log line ${i}`,
		'service.name': 'adservice',
	})),
);

test.describe('Dashboards — List panel', () => {
	test.beforeEach(async ({ dashboards, queryRange, panels }) => {
		await queryRange.respond(LOGS);
		await dashboards.seedAndOpen(singlePanelDashboard({ kind: PanelKind.List }));
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.List);
	});

	test('TC-01 its menu offers PNG and SVG downloads but no Create Alerts', async ({
		panels,
	}) => {
		const { actions } = panels.panel(SINGLE_PANEL_ID);

		expect(await actions.downloads()).toEqual(['PNG', 'SVG']);
		await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
	});

	test('TC-02 clicking a row opens the log detail drawer, not a drilldown menu', async ({
		panels,
	}) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await target.text('log line 0').click();

		await expect(panels.logDetail()).toBeVisible();
		await expect(panels.logDetail()).toContainText('log line 0');
		await expect(panels.drilldown.menu()).toHaveCount(0);
	});
});
