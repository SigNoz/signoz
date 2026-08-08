import { expect, test } from '../../../../fixtures/dashboards';
import {
	PanelKind,
	dashboardV2,
	panel,
} from '../../../../helpers/dashboard-v2-spec';
import {
	panelRenderer,
	panelRoot,
	waitForPanelRendered,
	RENDERER_TESTID,
} from '../../../../helpers/panels-v2';
import {
	QueryRange,
	mockQueryRange,
	mockQueryRangeError,
	ramp,
} from '../../../../helpers/query-range-mock';
import {
	ALL_KINDS_PANELS,
	COMPACT_PANELS,
	allKindsDashboard,
	compactDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: each kind mounts its renderer, the header shows the panel's identity,
// and lazy-fetch/status affordances behave. Interaction lives in sibling specs.

test.describe('Dashboards V2 — panel rendering', () => {
	test('TC-01 every panel kind mounts its own renderer', async ({
		authedPage: page,
		dashboards,
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
			await waitForPanelRendered(page, panelId, kind);
			await expect(panelRenderer(page, panelId, kind)).toBeVisible();
		}
	});

	test('TC-02 header shows the panel title and description tooltip', async ({
		authedPage: page,
		dashboards,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		await expect(root.getByTestId('panel-title')).toHaveText('Calls by service');

		const info = root.getByTestId('panel-header-info-icon');
		await expect(info).toBeVisible();
		await info.hover();
		await expect(
			page.getByText('Rate of signoz_calls_total grouped by service.name'),
		).toBeVisible();

		await expect(
			panelRoot(page, COMPACT_PANELS.table).getByTestId('panel-header-info-icon'),
		).toHaveCount(0);
	});

	test('TC-03 a below-the-fold panel does not query until scrolled into view', async ({
		authedPage: page,
		dashboards,
	}) => {
		// Panels fetch lazily, so the second section stays cold on first paint.
		await dashboards.seedAndOpen(allKindsDashboard());
		const list = panelRoot(page, ALL_KINDS_PANELS.list);
		await expect(list).toHaveAttribute('data-panel-visible', 'false');
		await expect(list.getByTestId(RENDERER_TESTID[PanelKind.List])).toHaveCount(
			0,
		);

		await list.scrollIntoViewIfNeeded();
		await expect(list).toHaveAttribute('data-panel-visible', 'true');
		await expect(list.getByTestId(RENDERER_TESTID[PanelKind.List])).toBeVisible();
	});

	test('TC-04 a query warning surfaces the warning indicator and its popover', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.withWarning(
				QueryRange.timeSeries([
					{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
				]),
				'sampled result',
			),
		);
		await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		const warning = root.getByTestId('panel-status-warning');
		await expect(warning).toBeVisible();
		await expect(warning).toHaveAttribute('aria-label', 'Panel warning');

		// Hover tooltip, not a popover; Radix renders the content twice, so scope
		// to the tooltip to avoid strict mode.
		await warning.hover();
		await expect(
			page.getByRole('tooltip').getByTestId('panel-status-content'),
		).toContainText('sampled result');
	});

	test('TC-05 a failed query surfaces the error indicator alongside the error body', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRangeError(page, 'boom from the querier');
		await dashboards.seedAndOpen(compactDashboard());

		const root = panelRoot(page, COMPACT_PANELS.timeseries);
		await expect(root.getByTestId('panel-status-error')).toBeVisible();
		await expect(root.getByTestId('panel-error')).toBeVisible();
	});

	test('TC-06 the time-preference pill reflects a panel-scoped window', async ({
		authedPage: page,
		dashboards,
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

		await expect(
			panelRoot(page, 'pinned').getByTestId('panel-time-preference'),
		).toBeVisible();
		await expect(
			panelRoot(page, 'global').getByTestId('panel-time-preference'),
		).toHaveCount(0);
	});

	test('TC-07 the Number panel renders a value, not an empty state', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(
			page,
			QueryRange.scalar({
				aggregationColumns: ['A'],
				rows: [[1234]],
			}),
		);
		await dashboards.seedAndOpen(allKindsDashboard());

		const root = panelRoot(page, ALL_KINDS_PANELS.number);
		await root.scrollIntoViewIfNeeded();
		await expect(
			panelRenderer(page, ALL_KINDS_PANELS.number, PanelKind.Number),
		).toBeVisible();
		await expect(root.getByTestId('number-panel-value')).toBeVisible();
		await expect(root.getByTestId('number-panel-no-data')).toHaveCount(0);
	});
});
