import {
	expect,
	PanelAction,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

const COUNTRIES = QueryRange.scalar({
	groupColumns: ['geo.country.iso_code'],
	aggregationColumns: ['A'],
	rows: [
		['US', 40],
		['BR', 25],
		['IN', 30],
		['RU', 10],
		['AU', 15],
	],
});

const NO_LOCATION = QueryRange.scalar({
	aggregationColumns: ['A'],
	rows: [[40]],
});

test.describe('Dashboards — Geo Map panel', () => {
	test.describe('grouped by country', () => {
		test.beforeEach(async ({ dashboards, queryRange, panels }) => {
			await queryRange.respond(COUNTRIES);
			await dashboards.seedAndOpen(
				singlePanelDashboard({ kind: PanelKind.GeoMap }),
			);
			const target = panels.panel(SINGLE_PANEL_ID);
			await target.waitRendered(PanelKind.GeoMap);
			await expect(target.geoMap.ready()).toBeVisible();
		});

		test('TC-01 its menu offers CSV and PNG downloads but no Create Alerts', async ({
			panels,
		}) => {
			const { actions } = panels.panel(SINGLE_PANEL_ID);

			expect(await actions.downloads()).toEqual(['CSV', 'PNG']);
			await expect(actions.item(PanelAction.createAlert)).toHaveCount(0);
		});

		test('TC-02 clicking a country opens the drilldown menu', async ({
			panels,
		}) => {
			await panels.panel(SINGLE_PANEL_ID).geoMap.clickShape();
			await expect(panels.drilldown.menu()).toBeVisible();
			await expect(panels.drilldown.item('drilldown-view-logs')).toBeVisible();
			await expect(panels.drilldown.item('drilldown-breakout')).toBeVisible();
		});
	});

	test('TC-03 a query without a location asks for one in Group By', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(NO_LOCATION);
		await dashboards.seedAndOpen(
			singlePanelDashboard({ kind: PanelKind.GeoMap }),
		);
		const { geoMap } = panels.panel(SINGLE_PANEL_ID);

		await expect(geoMap.emptyMessage()).toContainText('Group by a location');
		await expect(geoMap.ready()).toHaveCount(0);
	});
});
