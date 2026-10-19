import { expect, test, TIMELINE_PAGE_SIZE } from '../../../drivers/alerts';

// The two filters over the timeline: the expression editor and the state tabs.

test.describe('Alert history — filters', () => {
	test('TC-01 key suggestions load with the page', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		const keys = page.waitForResponse((res) =>
			/\/history\/filter_keys/.test(res.url()),
		);
		await alerts.history.goto(alertHistory.ruleId);
		const response = await keys;

		const body = (await response.json()) as {
			data: { keys: Record<string, { name: string }[]> } | null;
		};
		expect(Object.keys(body.data?.keys ?? {}).sort()).toEqual([
			'service.name',
			'severity',
			'threshold.name',
		]);
		const params = new URL(response.url()).searchParams;
		expect(params.get('startUnixMilli')).toBeTruthy();
		expect(params.get('endUnixMilli')).toBeTruthy();

		await expect(alerts.history.filterSearch()).toBeVisible();
		await expect(alerts.history.filterSkeleton()).toHaveCount(0);
	});

	test('TC-02 value suggestions come from the API and narrow as you type', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		const values = page.waitForResponse((res) =>
			/\/history\/filter_values/.test(res.url()),
		);
		await alerts.history.typeFilter("service.name = '");
		const response = await values;

		expect(new URL(response.url()).searchParams.get('name')).toBe('service.name');
		const body = (await response.json()) as {
			data: { values?: { stringValues?: string[] }; complete?: boolean } | null;
		};
		expect(body.data?.values?.stringValues).toEqual(
			[...alertHistory.services].sort(),
		);
		expect(body.data?.complete).toBe(true);

		// Narrowing is client-side over the same fetched list.
		await page.keyboard.type('svc-1');
		const options = alerts.history.suggestions();
		// The list shows a "Loading suggestions..." row until the values land.
		await expect(options.first()).toBeVisible();
		await expect(options.filter({ hasText: 'Loading suggestions' })).toHaveCount(
			0,
		);
		const texts = await options.allInnerTexts();
		expect(texts.length).toBeGreaterThan(0);
		expect(texts.length).toBeLessThan(alertHistory.services.length);
		for (const text of texts) {
			expect(text).toContain('svc-1');
		}
	});

	test('TC-03 an expression filters the table, resets the page and composes with the state tab', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId, {
			page: '2',
			timelineFilter: 'FIRED',
		});

		const service = alertHistory.services[3];
		const request = page.waitForRequest((req) =>
			alerts.history.isRequest(req, 'timeline'),
		);
		await alerts.history.runFilter(`service.name = '${service}'`);

		const params = new URL((await request).url()).searchParams;
		expect(params.get('filterExpression')).toBe(`service.name = '${service}'`);
		// Both filters reach the same request rather than replacing each other.
		expect(params.get('state')).toBe('firing');

		await expect(alerts.history.rows()).toHaveCount(1);
		await expect(page).toHaveURL(/[?&]alertHistoryExpression=/);
		await alerts.history.expectFirstPage();
	});

	test('TC-04 Run re-fetches an unchanged expression', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		const expression = `service.name = '${alertHistory.services[1]}'`;

		const first = alerts.history.waitForResponse('timeline', {
			filterExpression: expression,
		});
		await alerts.history.runFilter(expression);
		await first;
		await expect(alerts.history.rows()).toHaveCount(1);

		const again = page.waitForRequest((req) =>
			alerts.history.isRequest(req, 'timeline'),
		);
		await alerts.history.runQueryButton().click();
		await again;

		await expect(alerts.history.rows()).toHaveCount(1);
	});

	test('TC-05 an in-flight query can be cancelled', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		// Delay the real request rather than faking it: `route.continue()` still
		// reaches the backend, so only the timing is changed.
		await page.route(
			(url) => /\/history\/timeline/.test(url.pathname),
			async (route) => {
				await new Promise((resolve) => {
					setTimeout(resolve, 3_000);
				});
				await route.continue();
			},
		);

		await alerts.history.runFilter(
			`service.name = '${alertHistory.services[2]}'`,
		);

		const cancel = alerts.history.cancelQueryButton();
		await expect(cancel).toBeVisible();
		await cancel.click();

		await page.unrouteAll({ behavior: 'ignoreErrors' });
		await expect(alerts.history.cancelQueryButton()).toHaveCount(0);
		await expect(alerts.history.runQueryButton()).toBeVisible();
	});

	test('TC-06 threshold.name and severity filter per the rule schema', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		// The v2 rule's single threshold is `critical`, so both keys match every row.
		let response = alerts.history.waitForResponse('timeline', {
			filterExpression: `threshold.name = 'critical'`,
		});
		await alerts.history.runFilter(`threshold.name = 'critical'`);
		await response;
		await expect(alerts.history.rows()).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(alerts.history.footerRange()).toContainText(
			`of ${alertHistory.total}`,
		);

		response = alerts.history.waitForResponse('timeline', {
			filterExpression: `severity = 'critical'`,
		});
		await alerts.history.runFilter(`severity = 'critical'`);
		await response;
		await expect(alerts.history.footerRange()).toContainText(
			`of ${alertHistory.total}`,
		);

		// The v1 rule's threshold is named `warning`, so the same keys select the
		// opposite way round.
		await alerts.history.goto(alertHistory.ruleIdV1);
		response = alerts.history.waitForResponse('timeline', {
			filterExpression: `threshold.name = 'warning'`,
		});
		await alerts.history.runFilter(`threshold.name = 'warning'`);
		await response;
		await expect(alerts.history.footerRange()).toContainText(
			`of ${alertHistory.totalV1}`,
		);

		response = alerts.history.waitForResponse('timeline', {
			filterExpression: `threshold.name = 'critical'`,
		});
		await alerts.history.runFilter(`threshold.name = 'critical'`);
		await response;
		await expect(alerts.history.rows()).toHaveCount(0);
	});

	test('TC-07 an unknown key returns zero rows rather than an error', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		const response = alerts.history.waitForResponse('timeline', {
			filterExpression: `nonexistent.key = 'x'`,
		});
		await alerts.history.runFilter(`nonexistent.key = 'x'`);

		expect((await response).status()).toBe(200);
		await expect(alerts.history.rows()).toHaveCount(0);
		await expect(alerts.history.error()).toHaveCount(0);
	});

	test('TC-08 an invalid expression shows the syntax error and recovers on a fix', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		const rejected = alerts.history.waitForResponse('timeline', {
			filterExpression: 'service.name =',
		});
		await alerts.history.runFilter('service.name =');
		expect((await rejected).status()).toBe(400);

		const error = alerts.history.error();
		await expect(error).toBeVisible();
		await expect(error).toContainText(/syntax error/i);

		const fixed = `service.name = '${alertHistory.services[7]}'`;
		const accepted = alerts.history.waitForResponse('timeline', {
			status: 200,
			filterExpression: fixed,
		});
		await alerts.history.runFilter(fixed);
		await accepted;

		await expect(alerts.history.error()).toHaveCount(0);
		await expect(alerts.history.rows()).toHaveCount(1);
	});

	test('TC-09 clearing the expression restores the unfiltered list', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		const first = alerts.history.waitForResponse('timeline');
		await alerts.history.runFilter(
			`service.name = '${alertHistory.services[6]}'`,
		);
		await first;
		await expect(alerts.history.rows()).toHaveCount(1);

		const cleared = page.waitForRequest((req) =>
			alerts.history.isRequest(req, 'timeline'),
		);
		await alerts.history.runFilter('');

		expect(
			new URL((await cleared).url()).searchParams.get('filterExpression'),
		).toBeNull();
		await expect(alerts.history.footerRange()).toContainText(
			`of ${alertHistory.total}`,
		);
	});

	test('TC-10 the expression is lost on an Overview round-trip (known bug)', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		const applied = alerts.history.waitForResponse('timeline');
		await alerts.history.runFilter(
			`service.name = '${alertHistory.services[4]}'`,
		);
		await applied;
		await expect(alerts.history.rows()).toHaveCount(1);
		await expect(page).toHaveURL(/[?&]alertHistoryExpression=/);

		await alerts.details.sectionTab('overview').click();
		await alerts.details.sectionTab('history').click();

		await expect(alerts.history.table()).toBeVisible();
		expect(new URL(page.url()).searchParams.has('alertHistoryExpression')).toBe(
			false,
		);
		await expect(alerts.history.rows()).toHaveCount(TIMELINE_PAGE_SIZE);
	});

	test('TC-11 the state tabs send the right param and reset the page', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId, {
			timelineFilter: 'FIRED',
			page: '2',
		});
		// A deep-linked filter starts on its own tab.
		await expect(alerts.history.stateFilter('fired')).toHaveClass(/selected/);

		// A tab switch can be followed by a late refetch for the previous tab, so
		// each wait names the state it expects rather than taking the next request.
		const timelineWithState = (state: string | null): Promise<unknown> =>
			page.waitForRequest(
				(req) =>
					alerts.history.isRequest(req, 'timeline') &&
					new URL(req.url()).searchParams.get('state') === state,
				{ timeout: 15_000 },
			);

		// "All" is the absence of a state param, not a state of its own.
		let request = timelineWithState(null);
		await alerts.history.stateFilter('all').click();
		await expect(page).toHaveURL(/[?&]timelineFilter=ALL/);
		await request;
		await alerts.history.expectFirstPage();

		request = timelineWithState('firing');
		await alerts.history.stateFilter('fired').click();
		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);
		await request;
		await expect(alerts.history.rows().first()).toBeVisible();

		request = timelineWithState('inactive');
		await alerts.history.stateFilter('resolved').click();
		await expect(page).toHaveURL(/[?&]timelineFilter=RESOLVED/);
		await request;
		// This rule never resolved, so Resolved is empty.
		await expect(alerts.history.rows()).toHaveCount(0);
	});

	test('TC-12 a rule with resolutions splits between the Resolved and Fired tabs', async ({
		alerts,
		resolvedHistory,
	}) => {
		await alerts.history.goto(resolvedHistory.ruleId, {
			timelineFilter: 'RESOLVED',
		});

		await expect(alerts.history.rows()).toHaveCount(
			resolvedHistory.resolvedCount,
		);
		for (const text of await alerts.history
			.rowCell(alerts.history.rows(), 'state')
			.allInnerTexts()) {
			expect(text).toBe('Resolved');
		}

		const fired = alerts.history.waitForResponse('timeline');
		await alerts.history.stateFilter('fired').click();
		await fired;
		await expect(alerts.history.rows()).toHaveCount(resolvedHistory.firingCount);
	});
});
