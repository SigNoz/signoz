import {
	COMPACT_PANELS,
	PanelKind,
	QueryRange,
	compactDashboard,
	dashboardV2,
	expect,
	panel,
	ramp,
	test,
} from '../../../../drivers/panels';

// Scope: the panel header's identity and status affordances.

test.describe('Dashboards V2 — panel header', () => {
	test('TC-01 header shows the panel title and description tooltip', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.title()).toHaveText('Calls by service');

		const info = target.infoIcon();
		await expect(info).toBeVisible();
		await info.hover();
		await expect(
			panels.tooltip.text('Rate of signoz_calls_total grouped by service.name'),
		).toBeVisible();

		await expect(panels.panel(COMPACT_PANELS.table).infoIcon()).toHaveCount(0);
	});

	test('TC-02 a query warning surfaces the warning indicator and its popover', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(
			QueryRange.withWarning(
				QueryRange.timeSeries([
					{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
				]),
				'sampled result',
			),
		);
		await dashboards.seedAndOpen(compactDashboard());

		const warning = panels.panel(COMPACT_PANELS.timeseries).statusWarning();
		await expect(warning).toBeVisible();
		await expect(warning).toHaveAttribute('aria-label', 'Panel warning');

		// Hover tooltip, not a popover; Radix renders the content twice.
		await warning.hover();
		await expect(panels.tooltip.statusContent()).toContainText('sampled result');
	});

	test('TC-03 the time-preference pill reflects a panel-scoped window', async ({
		dashboards,
		panels,
	}) => {
		// The pill only renders when a panel opts OUT of the global range, so the
		// unpinned neighbour is the control.
		await dashboards.seedAndOpen(
			dashboardV2({
				sections: [
					{
						title: 'Time preference',
						panels: {
							pinned: panel(PanelKind.TimeSeries, {
								name: 'Pinned to 15m',
								pluginSpec: { visualization: { timePreference: 'last_15_min' } },
							}),
							global: panel(PanelKind.TimeSeries, {
								name: 'Follows the dashboard',
							}),
						},
					},
				],
			}),
		);

		await expect(panels.panel('pinned').timePreference()).toBeVisible();
		await expect(panels.panel('global').timePreference()).toHaveCount(0);
	});
});
