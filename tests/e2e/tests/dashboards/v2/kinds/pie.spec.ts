import {
	expect,
	PanelKind,
	QueryRange,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panels';

// A Pie reads a scalar result: one slice per group row.
const SHARES = QueryRange.scalar({
	groupColumns: ['service.name'],
	aggregationColumns: ['A'],
	rows: [
		['adservice', 10],
		['cartservice', 20],
		['frontend', 30],
	],
});

test.describe('Dashboards V2 — Pie panel', () => {
	test.beforeEach(async ({ queryRange, dashboards, panels }) => {
		await queryRange.respond(SHARES);
		// The legend is virtualized: a right legend keeps all three rows mounted.
		await dashboards.seedAndOpen(
			singlePanelDashboard({
				kind: PanelKind.PieChart,
				pluginSpec: { legend: { position: 'right' } },
			}),
		);
		await panels.panel(SINGLE_PANEL_ID).waitRendered(PanelKind.PieChart);
	});

	test('TC-01 every group gets a slice and a legend row', async ({ panels }) => {
		const pie = panels.panel(SINGLE_PANEL_ID);

		await expect(pie.pie.arcs()).toHaveCount(3);
		for (const label of ['adservice', 'cartservice', 'frontend']) {
			await expect(pie.legend.item(label)).toHaveCount(1);
		}
	});

	test('TC-02 the donut hole shows the total of the slices', async ({
		panels,
	}) => {
		await expect(panels.panel(SINGLE_PANEL_ID).pie.total()).toHaveText('60');
	});

	test('TC-03 hiding a group drops its slice and its share of the total', async ({
		panels,
	}) => {
		const pie = panels.panel(SINGLE_PANEL_ID);

		await pie.legend.toggle('frontend');

		await pie.legend.expectShown('frontend', false);
		await expect(pie.pie.arcs()).toHaveCount(2);
		await expect(pie.pie.total()).toHaveText('30');
	});
});
