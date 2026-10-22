import {
	PanelKind,
	PanelMessageText,
	QueryRange,
	SINGLE_PANEL_ID,
	expect,
	ramp,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panels';

// Scope: the PanelBody states and their recovery affordances.
//
// Mock-only: a healthy stack returns data, so no-data/error/warning are
// unreachable live. `panel-no-query` is not covered — the backend requires one
// VALID query per panel, so a saved dashboard can't contain a query-less one.

const ONE_SERIES = QueryRange.timeSeries([
	{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
]);

test.describe('Dashboards V2 — panel states', () => {
	test('TC-02 a failing query shows the error state and Retry refetches', async ({
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
		await expect(target.text(PanelMessageText.errorTitle)).toBeVisible();
		await expect(target.text('querier exploded')).toBeVisible();

		await queryRange.reset();
		await queryRange.respond(ONE_SERIES);

		// Retry must re-issue the query.
		await target.errorAction().click();
		await expect(target.error()).toHaveCount(0);
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
	});

	test('TC-03 an empty result offers Extend time range as primary and Retry as secondary', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.empty());
		await dashboards.seedAndOpen(singlePanelDashboard());

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.noData()).toBeVisible();
		await expect(target.text(PanelMessageText.noDataTitle)).toBeVisible();

		// Widenable window: Extend primary, Retry secondary.
		await expect(target.noDataAction()).toHaveText(PanelMessageText.extendAction);
		await expect(target.noDataSecondaryAction()).toHaveText(
			PanelMessageText.retryAction,
		);
	});

	test('TC-04 Extend time range widens the dashboard window', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.empty());
		await dashboards.seedAndOpen(singlePanelDashboard());

		const extend = panels.panel(SINGLE_PANEL_ID).noDataAction();
		await expect(extend).toBeVisible();

		const refetch = queryRange.nextRequest();
		await extend.click();
		await refetch;

		// Widening walks the URL-backed zoom-out ladder.
		await expect.poll(() => dashboards.param('relativeTime')).not.toBeNull();
	});

	test('TC-05 a panel pinned to a fixed window cannot extend, so Retry is primary', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		await queryRange.respond(QueryRange.empty());

		// A panel-scoped window means extend has nothing to widen.
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

	test('TC-06 an in-flight first query shows the loading state', async ({
		dashboards,
		queryRange,
		panels,
	}) => {
		// LOADING, not `panel-refetching` — the refetch spinner needs prior data.
		const held = await queryRange.hold(ONE_SERIES);

		await dashboards.seedAndOpen(singlePanelDashboard());

		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.loading()).toBeVisible();

		held.release();
		await expect(target.renderer(PanelKind.TimeSeries)).toBeVisible();
		await expect(target.loading()).toHaveCount(0);
	});
});
