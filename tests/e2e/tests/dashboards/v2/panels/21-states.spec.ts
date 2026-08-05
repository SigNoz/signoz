import { expect, test } from '../../../../fixtures/dashboards';
import { PanelMessageText, panelRoot } from '../../../../helpers/panels-v2';
import {
	QueryRange,
	mockQueryRange,
	mockQueryRangeError,
	ramp,
	unmockQueryRange,
} from '../../../../helpers/query-range-mock';
import {
	SINGLE_PANEL_ID,
	singlePanelDashboard,
} from '../../../../testdata/v2/panels-dashboard';

// Scope: the PanelBody states and their recovery affordances.
//
// Mock-only: a healthy stack returns data, so no-data/error/warning are
// unreachable live. `panel-no-query` is not covered — the backend requires one
// VALID query per panel, so a saved dashboard can't contain a query-less one.

test.describe('Dashboards V2 — panel states', () => {
	test('TC-02 a failing query shows the error state and Retry refetches', async ({
		authedPage: page,
		dashboards,
	}) => {
		// Fail every call, then swap to success before Retry: react-query retries
		// on its own, so "fail once then succeed" never surfaces the error state.
		await mockQueryRangeError(page, 'querier exploded');

		await dashboards.seedAndOpen(singlePanelDashboard());

		const root = panelRoot(page, SINGLE_PANEL_ID);
		const error = root.getByTestId('panel-error');
		await expect(error).toBeVisible();
		await expect(root.getByText(PanelMessageText.errorTitle)).toBeVisible();
		await expect(root.getByText('querier exploded')).toBeVisible();

		await unmockQueryRange(page);
		await mockQueryRange(
			page,
			QueryRange.timeSeries([
				{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
			]),
		);

		// Retry must re-issue the query.
		await root.getByTestId('panel-error-action').click();
		await expect(error).toHaveCount(0);
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();
	});

	test('TC-03 an empty result offers Extend time range as primary and Retry as secondary', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.empty());
		await dashboards.seedAndOpen(singlePanelDashboard());

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await expect(root.getByTestId('panel-no-data')).toBeVisible();
		await expect(root.getByText(PanelMessageText.noDataTitle)).toBeVisible();

		// Widenable window: Extend primary, Retry secondary.
		await expect(root.getByTestId('panel-no-data-action')).toHaveText(
			PanelMessageText.extendAction,
		);
		await expect(root.getByTestId('panel-no-data-secondary-action')).toHaveText(
			PanelMessageText.retryAction,
		);
	});

	test('TC-04 Extend time range widens the dashboard window', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.empty());
		await dashboards.seedAndOpen(singlePanelDashboard());

		const root = panelRoot(page, SINGLE_PANEL_ID);
		const extend = root.getByTestId('panel-no-data-action');
		await expect(extend).toBeVisible();

		const refetch = page.waitForRequest((r) => r.url().includes('/query_range'));
		await extend.click();
		await refetch;

		// Widening walks the URL-backed zoom-out ladder.
		await expect
			.poll(() => new URL(page.url()).searchParams.get('relativeTime'))
			.not.toBeNull();
	});

	test('TC-05 a panel pinned to a fixed window cannot extend, so Retry is primary', async ({
		authedPage: page,
		dashboards,
	}) => {
		await mockQueryRange(page, QueryRange.empty());

		// A panel-scoped window means extend has nothing to widen.
		await dashboards.seedAndOpen(
			singlePanelDashboard({
				pluginSpec: { visualization: { timePreference: 'last_15_min' } },
			}),
		);

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await expect(root.getByTestId('panel-no-data')).toBeVisible();
		await expect(root.getByTestId('panel-no-data-action')).toHaveText(
			PanelMessageText.retryAction,
		);
		await expect(root.getByTestId('panel-no-data-secondary-action')).toHaveCount(
			0,
		);
	});

	test('TC-06 an in-flight first query shows the loading state', async ({
		authedPage: page,
		dashboards,
	}) => {
		// LOADING, not `panel-refetching` — the refetch spinner needs prior data.
		let release: () => void = () => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route('**/api/v5/query_range', async (route) => {
			await gate;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(
					QueryRange.timeSeries([
						{ labels: { 'service.name': 'adservice' }, points: ramp(12, 1, 9) },
					]),
				),
			});
		});

		await dashboards.seedAndOpen(singlePanelDashboard());

		const root = panelRoot(page, SINGLE_PANEL_ID);
		await expect(root.getByTestId('panel-loading')).toBeVisible();

		release();
		await expect(root.getByTestId('time-series-renderer')).toBeVisible();
		await expect(root.getByTestId('panel-loading')).toHaveCount(0);
	});
});
