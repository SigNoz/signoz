import {
	DEFAULT_RELATIVE_TIME,
	expect,
	HISTORY_ENDPOINTS,
	test,
	TIMELINE_PAGE_SIZE,
} from '../../../drivers/alerts';

// Whole-page behaviour: deep links, history navigation, what one mount costs,
// and the states where there is nothing to show.

test.describe('Alert history — session', () => {
	test('TC-01 a full deep-link is honoured in one load', async ({
		alerts,
		alertHistory,
	}) => {
		const service = alertHistory.services[8];
		await alerts.history.goto(alertHistory.ruleId, {
			relativeTime: DEFAULT_RELATIVE_TIME,
			timelineFilter: 'FIRED',
			page: '1',
			order: 'desc',
			alertHistoryExpression: `service.name = '${service}'`,
			viewAllTopContributors: 'true',
		});

		await expect(alerts.history.table()).toBeVisible();
		await expect(alerts.history.contributorsDrawer()).toBeVisible();
		await expect(alerts.history.stateFilter('fired')).toHaveClass(/selected/);
		await expect(alerts.history.rows()).toHaveCount(1);
	});

	test('TC-02 a reload preserves every history param', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId, {
			timelineFilter: 'FIRED',
			page: '2',
			order: 'desc',
		});
		const before = new URL(page.url()).searchParams;

		await page.reload();
		await expect(alerts.history.table()).toBeVisible();

		const after = new URL(page.url()).searchParams;
		for (const [key, value] of before) {
			expect(after.get(key), `param ${key} survived the reload`).toBe(value);
		}
	});

	test('TC-03 back and forward restore the table state', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		await expect(alerts.history.rows()).toHaveCount(TIMELINE_PAGE_SIZE);

		await alerts.history.stateFilter('fired').click();
		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);

		await alerts.history.nextPageButton().click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(alerts.history.rows()).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);

		await page.goBack();
		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expect(alerts.history.rows()).toHaveCount(TIMELINE_PAGE_SIZE);

		await page.goForward();
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(alerts.history.rows()).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
	});

	test('TC-04 a full session stays clean and uses no legacy endpoint', async ({
		authedPage: page,
		alerts,
		alertHistory,
		noise,
	}) => {
		const requests = alerts.shell.recordRequests();

		await alerts.history.goto(alertHistory.ruleId);
		await alerts.history.stateFilter('fired').click();
		await alerts.history.nextPageButton().click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await alerts.history.sortDescending();
		await expect(page).toHaveURL(/[?&]order=desc/);
		await alerts.history.contributorsViewAll().click();
		await expect(alerts.history.contributorsDrawer()).toBeVisible();
		await alerts.history.goto(alertHistory.ruleId, { relativeTime: '6h' });

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);

		expect(
			requests
				.filter((req) => /\/api\/v1\/rules\/[^/]+\/history\//.test(req.url()))
				.map((req) => req.url()),
			'no legacy v1 history calls',
		).toEqual([]);
		for (const endpoint of HISTORY_ENDPOINTS) {
			expect(
				requests.filter((req) => alerts.history.isRequest(req, endpoint)).length,
				`v2 ${endpoint} endpoint was used`,
			).toBeGreaterThan(0);
		}
	});

	test('TC-05 one mount calls each endpoint once, with the expected params', async ({
		alerts,
		alertHistory,
	}) => {
		const requests = alerts.shell.recordRequests();

		await alerts.history.goto(alertHistory.ruleId, {
			timelineFilter: 'FIRED',
			page: '2',
		});
		await expect(alerts.history.table()).toBeVisible();
		await expect(alerts.history.statsCardValue('Total Triggered')).toBeVisible();

		for (const endpoint of HISTORY_ENDPOINTS) {
			expect(
				requests.filter((req) => alerts.history.isRequest(req, endpoint)),
				`${endpoint} called exactly once on mount`,
			).toHaveLength(1);
		}

		const timeline = requests
			.filter((req) => alerts.history.isRequest(req, 'timeline'))
			.pop();
		expect(timeline).toBeDefined();
		const timelineParams = new URL(timeline?.url() ?? '').searchParams;
		for (const key of ['start', 'end', 'limit', 'order', 'cursor', 'state']) {
			expect(timelineParams.get(key), `timeline carries ${key}`).toBeTruthy();
		}
		expect(timelineParams.get('limit')).toBe(String(TIMELINE_PAGE_SIZE));
		expect(timelineParams.get('cursor')).toBe(alerts.history.cursorFor(2));

		for (const endpoint of [
			'stats',
			'overall_status',
			'top_contributors',
		] as const) {
			const request = requests
				.filter((req) => alerts.history.isRequest(req, endpoint))
				.pop();
			const params = new URL(request?.url() ?? '').searchParams;
			expect(params.get('start'), `${endpoint} carries start`).toBeTruthy();
			expect(params.get('end'), `${endpoint} carries end`).toBeTruthy();
		}

		// filter_keys takes its window in different params from the rest.
		const keys = requests
			.filter((req) => /\/history\/filter_keys/.test(req.url()))
			.pop();
		expect(keys, 'filter_keys was requested').toBeDefined();
		const keyParams = new URL(keys?.url() ?? '').searchParams;
		expect(keyParams.get('startUnixMilli')).toBeTruthy();
		expect(keyParams.get('endUnixMilli')).toBeTruthy();
		expect(keyParams.get('start')).toBeNull();
	});

	test('TC-06 v1 and v2 rules both render their history', async ({
		alerts,
		alertHistory,
	}) => {
		for (const [variant, ruleId, total] of [
			['v2alpha1', alertHistory.ruleId, alertHistory.total],
			['v1', alertHistory.ruleIdV1, alertHistory.totalV1],
		] as const) {
			// eslint-disable-next-line no-await-in-loop
			await alerts.history.goto(ruleId);
			// eslint-disable-next-line no-await-in-loop
			await expect(
				alerts.details.root(),
				`${variant} rule renders the details shell`,
			).toHaveAttribute('data-schema-version', variant);
			// eslint-disable-next-line no-await-in-loop
			await expect(alerts.history.footerRange()).toContainText(`of ${total}`);
		}
	});

	test('TC-07 a rule with no history renders the empty state, not an error', async ({
		authedPage: page,
		alerts,
		emptyHistory,
	}) => {
		const keys = page.waitForResponse((res) =>
			/\/history\/filter_keys/.test(res.url()),
		);
		await alerts.history.goto(emptyHistory.ruleId);

		// No rows means no filter keys, and the editor still has to mount.
		const body = (await (await keys).json()) as {
			data: { keys?: Record<string, unknown> } | null;
		};
		expect(Object.keys(body.data?.keys ?? {})).toHaveLength(0);
		await expect(alerts.history.filterSkeleton()).toHaveCount(0);
		await expect(alerts.history.filterSearch()).toBeVisible();
		await alerts.history.typeFilter('anything.at.all');
		await expect(alerts.history.filterEditor()).toContainText('anything.at.all');

		await expect(alerts.history.rows()).toHaveCount(0);
		await expect(alerts.history.statsCardValue('Total Triggered')).toHaveText(
			'None Triggered.',
		);
		await expect(
			alerts.history.statsCardValue('Avg. Resolution Time'),
		).toHaveText('No Resolutions.');
		await expect(alerts.history.contributorRows()).toHaveCount(0);
		await expect(alerts.history.error()).toHaveCount(0);
	});

	test('TC-08 an empty time range empties the page and resets pagination', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		const end = Date.now() - 24 * 60 * 60 * 1000;
		await alerts.history.goto(alertHistory.ruleId, {
			startTime: String(end - 30 * 60 * 1000),
			endTime: String(end),
		});

		await expect(alerts.history.rows()).toHaveCount(0);
		await expect(alerts.history.statsCardValue('Total Triggered')).toHaveText(
			'None Triggered.',
		);
		await expect(alerts.history.error()).toHaveCount(0);

		await alerts.history.goto(alertHistory.ruleId, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);
		await alerts.history.timeRangeInput().click();
		await alerts.history.timeRangeOption('Last 6 hours').click();
		await alerts.history.expectFirstPage();
	});

	test('TC-09 a 90 day range still renders', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId, { relativeTime: '90d' });

		await expect(alerts.history.table()).toBeVisible();
		await expect(alerts.history.rows().first()).toBeVisible();
		await expect(alerts.history.graphTitle()).toContainText(
			`${alertHistory.total} triggers in`,
		);
	});

	test('TC-10 an unknown rule never reaches the history APIs', async ({
		alerts,
		alertHistory,
	}) => {
		const requests = alerts.shell.recordRequests();

		await alerts.history.open('not-a-real-rule-id');
		await expect(alerts.details.notFoundMessage()).toBeVisible();
		expect(requests.filter((req) => /\/history\//.test(req.url()))).toHaveLength(
			0,
		);

		// And a rule that existed a moment ago behaves the same once deleted.
		const doomed = await alerts.seed.logsRule({
			name: `e2e-ah-doomed-${Date.now()}`,
			marker: alertHistory.marker,
			channels: [alertHistory.channelName],
		});
		await alerts.seed.setDisabled(doomed, true);
		await alerts.history.goto(doomed);
		await expect(alerts.history.table()).toBeVisible();

		await alerts.seed.deleteRule(doomed);
		await alerts.history.open(doomed);
		await expect(alerts.details.notFoundMessage()).toBeVisible();
	});
});
