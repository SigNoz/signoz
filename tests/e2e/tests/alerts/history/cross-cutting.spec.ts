import { expect, test } from '../../../fixtures/alerts/alert-history';
import {
	ALERT_HISTORY_PATH,
	DEFAULT_RELATIVE_TIME,
	TIMELINE_PAGE_SIZE,
} from '../../../helpers/alerts/constants';
import {
	encodeTimelineCursor,
	gotoAlertHistory,
	HISTORY_ENDPOINTS,
	isHistoryRequest,
	sortTimelineDescending,
	statsCard,
	timelineFooterRange,
	timelineRows,
} from '../../../helpers/alerts/history';
import {
	collectRequests,
	requestUrl,
	watchConsole,
} from '../../../helpers/common';

test.describe('Alert history — cross-cutting', () => {
	test('TC-01 full deep-link with all params is honoured in one load', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const service = alertHistory.services[8];
		await page.goto(
			`${ALERT_HISTORY_PATH}?ruleId=${alertHistory.ruleId}` +
				`&relativeTime=${DEFAULT_RELATIVE_TIME}` +
				`&timelineFilter=FIRED&page=1&order=desc` +
				`&alertHistoryExpression=${encodeURIComponent(`service.name = '${service}'`)}` +
				`&viewAllTopContributors=true`,
		);

		await expect(page.getByTestId('timeline-table')).toBeVisible();
		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-fired')).toHaveClass(
			/selected/,
		);
		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('TC-02 page reload preserves all history params', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
			page: '2',
			order: 'desc',
		});
		const before = new URL(page.url()).searchParams;

		await page.reload();
		await expect(page.getByTestId('timeline-table')).toBeVisible();

		const after = new URL(page.url()).searchParams;
		for (const [key, value] of before) {
			expect(after.get(key), `param ${key} survived the reload`).toBe(value);
		}
	});

	test('TC-03 browser back/forward restores correct table state', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);

		await page.getByTestId('timeline-filter-fired').click();
		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);

		await page.getByTestId('timeline-next-page').click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);

		await page.goBack();
		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);

		await page.goForward();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
	});

	test('TC-04 no unhandled console errors across full history session', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const watch = watchConsole(page);

		await gotoAlertHistory(page, alertHistory.ruleId);
		await page.getByTestId('timeline-filter-fired').click();
		await page.getByTestId('timeline-next-page').click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await sortTimelineDescending(page);
		await expect(page).toHaveURL(/[?&]order=desc/);
		await page.getByTestId('top-contributors-view-all').click();
		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();

		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});

	test('TC-05 no request storm on mount (exactly one call per endpoint)', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requests = collectRequests(page);

		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toBeVisible();

		for (const endpoint of HISTORY_ENDPOINTS) {
			const calls = requests.filter((req) => isHistoryRequest(req, endpoint));
			expect(calls, `${endpoint} called exactly once on mount`).toHaveLength(1);
		}
	});

	test('TC-06 v1 and v2 schema rules both render history correctly', async ({
		authedPage: page,
		alertHistory,
	}) => {
		for (const [variant, ruleId, total] of [
			['v2', alertHistory.ruleId, alertHistory.total],
			['v1', alertHistory.ruleIdV1, alertHistory.totalV1],
		] as const) {
			await gotoAlertHistory(page, ruleId);
			await expect(
				page.getByTestId('alert-details-root'),
				`${variant} rule renders the details shell`,
			).toHaveAttribute(
				'data-schema-version',
				variant === 'v2' ? 'v2alpha1' : 'v1',
			);
			await expect(timelineFooterRange(page)).toContainText(`of ${total}`);
		}
	});

	test('TC-07 no legacy v1 history API calls during full session', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requests = collectRequests(page);

		await gotoAlertHistory(page, alertHistory.ruleId);
		await page.getByTestId('timeline-filter-fired').click();
		await page.getByTestId('timeline-next-page').click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await sortTimelineDescending(page);
		await expect(page).toHaveURL(/[?&]order=desc/);
		await gotoAlertHistory(page, alertHistory.ruleId, { relativeTime: '6h' });

		const legacy = requests.filter((req) =>
			/\/api\/v1\/rules\/[^/]+\/history\//.test(req.url()),
		);
		expect(
			legacy.map((req) => req.url()),
			'no legacy POST /api/v1/rules/*/history/* calls',
		).toEqual([]);

		for (const endpoint of HISTORY_ENDPOINTS) {
			expect(
				requests.filter((req) => isHistoryRequest(req, endpoint)).length,
				`v2 ${endpoint} endpoint was used`,
			).toBeGreaterThan(0);
		}
	});

	test('TC-08 history API endpoints carry expected params', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requests = collectRequests(page);

		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
			page: '2',
		});
		await expect(page.getByTestId('timeline-table')).toBeVisible();

		const timeline = requests
			.filter((req) => isHistoryRequest(req, 'timeline'))
			.pop();
		expect(timeline).toBeDefined();
		const timelineParams = requestUrl(timeline!).searchParams;
		for (const key of ['start', 'end', 'limit', 'order', 'cursor', 'state']) {
			expect(timelineParams.get(key), `timeline carries ${key}`).toBeTruthy();
		}
		expect(timelineParams.get('limit')).toBe(String(TIMELINE_PAGE_SIZE));
		expect(timelineParams.get('cursor')).toBe(encodeTimelineCursor(2));

		for (const endpoint of [
			'stats',
			'overall_status',
			'top_contributors',
		] as const) {
			const request = requests
				.filter((req) => isHistoryRequest(req, endpoint))
				.pop();
			expect(request, `${endpoint} was requested`).toBeDefined();
			const params = requestUrl(request!).searchParams;
			expect(params.get('start'), `${endpoint} carries start`).toBeTruthy();
			expect(params.get('end'), `${endpoint} carries end`).toBeTruthy();
		}

		const keys = requests
			.filter((req) => /\/history\/filter_keys/.test(req.url()))
			.pop();
		expect(keys, 'filter_keys was requested').toBeDefined();
		const keyParams = requestUrl(keys!).searchParams;
		expect(keyParams.get('startUnixMilli')).toBeTruthy();
		expect(keyParams.get('endUnixMilli')).toBeTruthy();
		expect(keyParams.get('start')).toBeNull();
	});
});
