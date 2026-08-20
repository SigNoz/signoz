import { expect, test } from '../../../fixtures/alerts/alert-history';
import {
	createLogsAlertViaApi,
	deleteAlertViaApi,
	setRuleDisabledViaApi,
} from '../../../helpers/alerts/api';
import { ALERT_HISTORY_PATH, TIMELINE_PAGE_SIZE } from '../../../helpers/alerts/constants';
import {
	expectFirstPage,
	gotoAlertHistory,
	runFilterExpression,
	statsCard,
	timelineFooterRange,
	timelineRows,
	waitForHistoryResponse,
} from '../../../helpers/alerts/history';
import { collectRequests } from '../../../helpers/common';
import { typeExpression } from '../../../helpers/query-builder';

test.describe('Alert history — error and empty states', () => {
	test('TC-01 invalid filter expression shows syntax error and recovers on fix', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const responsePromise = waitForHistoryResponse(page, 'timeline', {
			filterExpression: 'service.name =',
		});
		await runFilterExpression(page, 'service.name =');
		const response = await responsePromise;
		expect(response.status()).toBe(400);

		const error = page.getByTestId('timeline-error');
		await expect(error).toBeVisible();
		await expect(error).toContainText(/syntax error/i);

		const fixed = `service.name = '${alertHistory.services[7]}'`;
		const fixResponsePromise = waitForHistoryResponse(page, 'timeline', {
			status: 200,
			filterExpression: fixed,
		});
		await runFilterExpression(page, fixed);
		await fixResponsePromise;
		await expect(page.getByTestId('timeline-error')).toHaveCount(0);
		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('TC-02 empty filter_keys response still mounts editor (no suggestions)', async ({
		authedPage: page,
		emptyHistory,
	}) => {
		const keysPromise = page.waitForResponse((res) =>
			/\/history\/filter_keys/.test(res.url()),
		);
		await gotoAlertHistory(page, emptyHistory.ruleId);
		const keysResponse = await keysPromise;

		const body = (await keysResponse.json()) as {
			data: { keys?: Record<string, unknown> } | null;
		};
		expect(Object.keys(body.data?.keys ?? {})).toHaveLength(0);

		await expect(page.getByTestId('timeline-filter-skeleton')).toHaveCount(0);
		await expect(page.getByTestId('timeline-filter-search')).toBeVisible();
		await typeExpression(page, 'anything.at.all');
		await expect(
			page.locator('.query-where-clause-editor .cm-content'),
		).toContainText('anything.at.all');
	});

	test('TC-03 bogus ruleId never reaches history APIs (shows AlertNotFound)', async ({
		authedPage: page,
	}) => {
		const requests = collectRequests(page);

		await page.goto(`${ALERT_HISTORY_PATH}?ruleId=not-a-real-rule-id`);
		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();

		expect(requests.filter((req) => /\/history\//.test(req.url()))).toHaveLength(
			0,
		);
	});

	test('TC-04 rule with no history renders empty state (not error)', async ({
		authedPage: page,
		emptyHistory,
	}) => {
		await gotoAlertHistory(page, emptyHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(0);
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText('None Triggered.');
		await expect(
			statsCard(page, 'Avg. Resolution Time').getByTestId('stats-card-value'),
		).toHaveText('No Resolutions.');
		await expect(page.getByTestId('top-contributors-row')).toHaveCount(0);
		await expect(page.getByTestId('timeline-error')).toHaveCount(0);
	});

	test('TC-05 time range with no data renders empty state', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const end = Date.now() - 24 * 60 * 60 * 1000;
		const start = end - 30 * 60 * 1000;
		await gotoAlertHistory(page, alertHistory.ruleId, {
			startTime: String(start),
			endTime: String(end),
		});

		await expect(timelineRows(page)).toHaveCount(0);
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText('None Triggered.');
		await expect(page.getByTestId('timeline-error')).toHaveCount(0);
	});

	test('TC-06 time-range change resets pagination to first page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);

		await page.locator('.filters input').first().click();
		await page.getByText('Last 6 hours', { exact: true }).click();

		await expectFirstPage(page);
	});

	test('TC-07 absurd time range (90d) still renders', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { relativeTime: '90d' });

		await expect(page.getByTestId('timeline-table')).toBeVisible();
		await expect(timelineRows(page).first()).toBeVisible();
		await expect(page.getByTestId('timeline-graph-title')).toContainText(
			`${alertHistory.total} triggers in`,
		);
	});

	test('TC-08 disabled rule history is still readable', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);
	});

	test('TC-09 deleted rule shows AlertNotFound on revisit', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const doomedId = await createLogsAlertViaApi(page, {
			name: `e2e-ah-doomed-${Date.now()}`,
			marker: alertHistory.marker,
			channels: [alertHistory.channelName],
		});
		await setRuleDisabledViaApi(page, doomedId, true);

		await gotoAlertHistory(page, doomedId);
		await expect(page.getByTestId('timeline-table')).toBeVisible();

		await deleteAlertViaApi(page, doomedId);

		await page.goto(`${ALERT_HISTORY_PATH}?ruleId=${doomedId}`);
		await expect(
			page.getByText("Uh-oh! We couldn't find the given alert rule."),
		).toBeVisible();
	});
});
