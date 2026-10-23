import {
	PanelMessageText,
	QueryRange,
	SINGLE_PANEL_ID,
	expect,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panels';

// Scope: the no-data state's Extend time range recovery.
//
// Mock-only: a healthy stack returns data, so no-data is unreachable live.

test.describe('Dashboards V2 — panel states', () => {
	test('TC-01 Extend time range widens the dashboard window', async ({
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

	test('TC-02 a panel pinned to a fixed window cannot extend, so Retry is primary', async ({
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
});
