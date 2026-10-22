import {
	ALL_KINDS_PANELS,
	COMPACT_PANELS,
	PanelKind,
	QueryRange,
	allKindsDashboard,
	compactDashboard,
	dashboardV2,
	expect,
	panel,
	ramp,
	test,
} from '../../../../drivers/panels';

// Scope: each kind mounts its renderer, the header shows the panel's identity,
// and lazy-fetch/status affordances behave. Interaction lives in sibling specs.

test.describe('Dashboards V2 — panel rendering', () => {
	test('TC-01 every panel kind mounts its own renderer', async ({
		dashboards,
		panels,
	}) => {
		await dashboards.seedAndOpen(allKindsDashboard());

		const expected: [string, PanelKind][] = [
			[ALL_KINDS_PANELS.timeseries, PanelKind.TimeSeries],
			[ALL_KINDS_PANELS.bar, PanelKind.BarChart],
			[ALL_KINDS_PANELS.histogram, PanelKind.Histogram],
			[ALL_KINDS_PANELS.pie, PanelKind.PieChart],
			[ALL_KINDS_PANELS.number, PanelKind.Number],
			[ALL_KINDS_PANELS.table, PanelKind.Table],
			[ALL_KINDS_PANELS.list, PanelKind.List],
		];

		for (const [panelId, kind] of expected) {
			const target = panels.panel(panelId);
			await target.waitRendered(kind);
			await expect(target.renderer(kind)).toBeVisible();
		}
	});

	test('TC-02 header shows the panel title and description tooltip', async ({
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

	test('TC-03 a below-the-fold panel does not query until scrolled into view', async ({
		dashboards,
		panels,
	}) => {
		// Panels fetch lazily, so the second section stays cold on first paint.
		await dashboards.seedAndOpen(allKindsDashboard());
		const list = panels.panel(ALL_KINDS_PANELS.list);
		await expect(list.visibility()).toHaveAttribute(
			'data-panel-visible',
			'false',
		);
		await expect(list.renderer(PanelKind.List)).toHaveCount(0);

		await list.scrollIntoView();
		await expect(list.visibility()).toHaveAttribute('data-panel-visible', 'true');
		await expect(list.renderer(PanelKind.List)).toBeVisible();
	});

	test('TC-04 a query warning surfaces the warning indicator and its popover', async ({
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

	test('TC-05 a failed query surfaces the error indicator alongside the error body', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.fail('boom from the querier');
		await dashboards.seedAndOpen(compactDashboard());

		const target = panels.panel(COMPACT_PANELS.timeseries);
		await expect(target.statusError()).toBeVisible();
		await expect(target.error()).toBeVisible();
	});

	test('TC-06 the time-preference pill reflects a panel-scoped window', async ({
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

	test('TC-07 the Number panel renders a value, not an empty state', async ({
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
});
