import { expect, test } from '../../../fixtures/alerts/alert-history';
import {
	DEFAULT_RELATIVE_TIME,
	gotoAlertHistory,
	isHistoryRequest,
} from '../../../helpers/alerts';
import { watchConsole } from '../../../helpers/common';

test.describe('Alert history — timeline graph', () => {
	test('TC-01 renders canvas with two segments (inactive→firing)', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const watch = watchConsole(page);

		const statusPromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'overall_status'),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		const status = await statusPromise;

		const body = (await status.json()) as {
			data: { state: string }[] | null;
		};
		const states = (body.data ?? []).map((segment) => segment.state);
		expect(states).toEqual(['inactive', 'firing']);

		await expect(page.getByTestId('timeline-graph')).toBeVisible();
		await expect(
			page.getByTestId('timeline-graph').locator('canvas'),
		).toBeVisible();

		await expect(page.getByTestId('timeline-graph-title')).toHaveText(
			`${alertHistory.total} triggers in ${DEFAULT_RELATIVE_TIME}`,
		);

		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});

	test('TC-02 renders canvas with three segments (inactive→firing→inactive)', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		const watch = watchConsole(page);

		const statusPromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'overall_status'),
		);
		await gotoAlertHistory(page, resolvedHistory.ruleId);
		const status = await statusPromise;

		const body = (await status.json()) as { data: { state: string }[] | null };
		expect((body.data ?? []).map((s) => s.state)).toEqual([
			'inactive',
			'firing',
			'inactive',
		]);
		await expect(
			page.getByTestId('timeline-graph').locator('canvas'),
		).toBeVisible();
		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});

	test('TC-03 handles nodata state without console errors', async ({
		authedPage: page,
		noDataHistory,
	}) => {
		const watch = watchConsole(page);

		const statusPromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'overall_status'),
		);
		await gotoAlertHistory(page, noDataHistory.ruleId);
		const status = await statusPromise;

		const body = (await status.json()) as { data: { state: string }[] | null };
		const KNOWN_STATES = [
			'firing',
			'inactive',
			'pending',
			'nodata',
			'recovering',
			'disabled',
		];
		const states = (body.data ?? []).map((segment) => segment.state);
		expect(states.length).toBeGreaterThan(0);
		for (const state of states) {
			expect(KNOWN_STATES).toContain(state);
		}

		await expect(
			page.getByTestId('timeline-graph').locator('canvas'),
		).toBeVisible();
		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});
});
