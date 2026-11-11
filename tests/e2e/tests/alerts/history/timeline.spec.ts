import { expect, test, TIMELINE_PAGE_SIZE } from '../../../drivers/alerts';

// The timeline table and its pagination, against history rows the ruler really
// produced.
//
// Three states have no cheap fixture and are deliberately uncovered: `pending`
// and `recovering` are transient and nothing can hold them still; a `disabled`
// row is policy-driven and the ruler writes none when a rule is disabled
// (verified); and asserting a row exactly at `start` versus `start-1ms` needs
// control over evaluation timestamps the ruler chooses for itself.

test.describe('Alert history — timeline', () => {
	test('TC-01 the timeline renders its chrome, rows and footer range', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		await expect(alerts.history.timelineTitle()).toHaveText('Timeline');
		await expect(alerts.history.timelineTab('overall-status')).toBeVisible();
		await expect(alerts.history.stateFilter('all')).toBeVisible();
		await expect(alerts.history.stateFilter('fired')).toBeVisible();
		await expect(alerts.history.stateFilter('resolved')).toBeVisible();
		await expect(alerts.history.graph()).toBeVisible();
		await expect(alerts.history.table()).toBeVisible();

		const contributorsTab = alerts.history.timelineTab('top-contributors');
		await expect(contributorsTab).toBeDisabled();
		await expect(contributorsTab).toContainText('Coming Soon');

		await expect(alerts.history.rows()).toHaveCount(TIMELINE_PAGE_SIZE);
		const first = alerts.history.rows().first();
		await expect(alerts.history.rowCell(first, 'state')).toHaveText('Firing');
		await expect(alerts.history.rowCell(first, 'labels')).toContainText(
			'service.name',
		);
		await expect(alerts.history.rowCell(first, 'created-at')).toHaveText(
			/^[A-Z][a-z]{2} \d{1,2}, \d{4} ⎯ \d{2}:\d{2}:\d{2}$/,
		);
		await expect(alerts.history.footerRange()).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);

		// A row is not a link: clicking one must not navigate.
		const before = page.url();
		await first.click();
		expect(page.url()).toBe(before);
		await expect(alerts.history.table()).toBeVisible();
	});

	test('TC-02 paging forward sends the cursor and covers the rest of the rows', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		await expect(alerts.history.rows().first()).toBeVisible();
		const pageOne = await alerts.history.rowLabels();
		await expect(alerts.history.prevPageButton()).toBeDisabled();

		const request = page.waitForRequest((req) =>
			alerts.history.isRequest(req, 'timeline'),
		);
		await alerts.history.nextPageButton().click();

		expect(new URL((await request).url()).searchParams.get('cursor')).toBe(
			alerts.history.cursorFor(2),
		);
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(alerts.history.rows()).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
		await expect(alerts.history.footerRange()).toHaveText(
			`${TIMELINE_PAGE_SIZE + 1} — ${alertHistory.total} of ${alertHistory.total}`,
		);
		await expect(alerts.history.nextPageButton()).toBeDisabled();
		await expect(alerts.history.prevPageButton()).toBeEnabled();

		// Together the two pages are the whole set, with nothing repeated.
		const pageTwo = await alerts.history.rowLabels();
		expect(pageTwo).not.toEqual(pageOne);
		expect(pageOne.length + pageTwo.length).toBe(alertHistory.total);
		expect(new Set([...pageOne, ...pageTwo]).size).toBe(alertHistory.total);
	});

	test('TC-03 paging back drops the cursor, and so does the browser Back button', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId, { page: '2' });

		const request = page.waitForRequest((req) =>
			alerts.history.isRequest(req, 'timeline'),
		);
		await alerts.history.prevPageButton().click();

		expect(new URL((await request).url()).searchParams.get('cursor')).toBeNull();
		await expect(alerts.history.footerRange()).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);

		await alerts.history.nextPageButton().click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await page.goBack();
		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expect(alerts.history.footerRange()).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('TC-04 ?page=2 deep-links straight to the second page', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		const request = page.waitForRequest(
			(req) =>
				alerts.history.isRequest(req, 'timeline') &&
				new URL(req.url()).searchParams.get('cursor') ===
					alerts.history.cursorFor(2),
		);
		await alerts.history.goto(alertHistory.ruleId, { page: '2' });
		await request;

		await expect(alerts.history.rows()).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
	});

	test('TC-05 the default order is ascending and sorting resets the page', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		const request = page.waitForRequest((req) =>
			alerts.history.isRequest(req, 'timeline'),
		);
		await alerts.history.goto(alertHistory.ruleId, { page: '2' });

		// Ascending is the default, so the URL carries no `order` while the request
		// spells it out.
		expect(new URL(page.url()).searchParams.get('order')).toBeNull();
		expect(new URL((await request).url()).searchParams.get('order')).toBe('asc');

		await alerts.history.sortDescending();

		await expect(page).toHaveURL(/[?&]order=desc/);
		await alerts.history.expectFirstPage();
	});

	test('TC-06 a single-page rule disables both pagination buttons', async ({
		alerts,
		metricsHistory,
	}) => {
		await alerts.history.goto(metricsHistory.ruleId);

		await expect(alerts.history.rows()).toHaveCount(metricsHistory.total);
		await expect(alerts.history.prevPageButton()).toBeDisabled();
		await expect(alerts.history.nextPageButton()).toBeDisabled();
		await expect(alerts.history.footerRange()).toHaveText(
			`1 — ${metricsHistory.total} of ${metricsHistory.total}`,
		);
	});

	test('TC-07 a logs rule links its rows to the logs explorer', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		await alerts.history.openRowActions(0);

		const viewLogs = alerts.history.viewLogsLink();
		await expect(viewLogs).toBeVisible();
		await viewLogs.click();

		await expect(page).toHaveURL(/\/logs\/logs-explorer/);
		const search = new URL(page.url()).searchParams;
		expect(search.get('startTime')).toBeTruthy();
		expect(search.get('endTime')).toBeTruthy();
		expect(page.url()).toContain('compositeQuery');
	});

	test('TC-08 a traces rule links its rows to the traces explorer only', async ({
		authedPage: page,
		alerts,
		tracesHistory,
	}) => {
		await alerts.history.goto(tracesHistory.ruleId);
		await alerts.history.openRowActions(0);

		// The backend returns one related link or the other, never both.
		const viewTraces = alerts.history.viewTracesLink();
		await expect(viewTraces).toBeVisible();
		await expect(alerts.history.viewLogsLink()).toHaveCount(0);
		await viewTraces.click();

		await expect(page).toHaveURL(/\/traces-explorer/);
		const search = new URL(page.url()).searchParams;
		expect(search.get('startTime')).toBeTruthy();
		expect(search.get('endTime')).toBeTruthy();
		expect(page.url()).toContain('compositeQuery');
	});

	test('TC-09 a metrics rule has no related links at all', async ({
		alerts,
		metricsHistory,
	}) => {
		await alerts.history.goto(metricsHistory.ruleId);

		await expect(
			alerts.history.rowCell(alerts.history.rows().first(), 'actions'),
		).toBeDisabled();
		await expect(alerts.history.viewLogsLink()).toHaveCount(0);
		await expect(alerts.history.viewTracesLink()).toHaveCount(0);
	});

	test('TC-10 CREATED AT follows the app timezone setting', async ({
		authedPage: page,
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		await expect(alerts.history.rows().first()).toBeVisible();
		const utcCell = await alerts.history.firstRowCreatedAt();

		await page.addInitScript(() =>
			localStorage.setItem('PREFERRED_TIMEZONE', 'Asia/Kolkata'),
		);
		await alerts.history.goto(alertHistory.ruleId);
		await expect(alerts.history.rows().first()).toBeVisible();

		expect(await alerts.history.firstRowCreatedAt()).not.toBe(utcCell);
	});

	test('TC-11 the state cell renders Firing, Resolved and No Data', async ({
		alerts,
		noDataHistory,
		resolvedHistory,
	}) => {
		await alerts.history.goto(resolvedHistory.ruleId);
		await expect(alerts.history.rows().first()).toBeVisible();
		const labels = [
			...new Set(
				await alerts.history
					.rowCell(alerts.history.rows(), 'state')
					.allInnerTexts(),
			),
		];
		expect(labels).toContain('Firing');
		expect(labels).toContain('Resolved');

		await alerts.history.goto(noDataHistory.ruleId);
		await expect(
			alerts.history.rowCell(alerts.history.rows(), 'state').first(),
		).toHaveText('No Data');
	});
});
