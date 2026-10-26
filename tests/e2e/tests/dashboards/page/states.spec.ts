import {
	PanelKind,
	PanelMessageText,
	QueryRange,
	SINGLE_PANEL_ID,
	expect,
	ramp,
	singlePanelDashboard,
	test,
} from '../../../drivers/panels';

// Mock-only: a healthy stack always returns data. Every kind shares these
// states, so they are covered once, on TimeSeries.

const SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 2, 8) },
]);

test.describe('Dashboards — panel states', () => {
	test('TC-01 an empty result offers Extend time range, which widens the window', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.empty());
		await dashboards.seedAndOpen(singlePanelDashboard());

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.noData()).toBeVisible();
		await expect(target.text(PanelMessageText.noDataTitle)).toBeVisible();
		await expect(target.noDataAction()).toHaveText(PanelMessageText.extendAction);
		await expect(target.noDataSecondaryAction()).toHaveText(
			PanelMessageText.retryAction,
		);

		const refetch = queryRange.nextRequest();
		await target.noDataAction().click();
		await refetch;

		// Widening walks the URL-backed zoom-out ladder.
		await expect.poll(() => dashboards.param('relativeTime')).not.toBeNull();
	});

	test('TC-02 a panel pinned to a fixed window cannot extend, so Retry is primary', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.empty());

		await dashboards.seedAndOpen(
			singlePanelDashboard({
				pluginSpec: { visualization: { timePreference: 'last_15_min' } },
			}),
		);

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.noData()).toBeVisible();
		await expect(target.noDataAction()).toHaveText(PanelMessageText.retryAction);
		await expect(target.noDataSecondaryAction()).toHaveCount(0);
	});

	test('TC-03 a failing query shows the error state and Retry refetches', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		// Fail every call, then swap to success before Retry: react-query retries
		// on its own, so "fail once then succeed" never surfaces the error state.
		await queryRange.fail('querier exploded');
		await dashboards.seedAndOpen(singlePanelDashboard());

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.error()).toBeVisible();
		await expect(target.statusError()).toBeVisible();
		await expect(target.text(PanelMessageText.errorTitle)).toBeVisible();
		await expect(target.text('querier exploded')).toBeVisible();

		await queryRange.reset();
		await queryRange.respond(SERIES);

		await target.errorAction().click();
		await expect(target.error()).toHaveCount(0);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
	});

	test('TC-04 an in-flight first query shows the loading state', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		// The loading state, not `panel-refetching`, which needs prior data.
		const held = await queryRange.hold(SERIES);
		await dashboards.seedAndOpen(singlePanelDashboard());

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.loading()).toBeVisible();

		held.release();
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		await expect(target.loading()).toHaveCount(0);
	});
});
