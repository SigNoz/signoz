import type { Page, Request } from '@playwright/test';

import { expect, test } from '../../fixtures/alert-history';
import {
	ALERT_HISTORY_PATH,
	createLogsAlertViaApi,
	deleteAlertViaApi,
	DEFAULT_RELATIVE_TIME,
	encodeTimelineCursor,
	expectFirstPage,
	gotoAlertHistory,
	setRuleDisabledViaApi,
	statsCard,
	TIMELINE_PAGE_SIZE,
	timelineFooterRange,
	timelineRows,
} from '../../helpers/alerts';
import { watchConsole } from '../../helpers/common';
import { typeExpression } from '@helpers/query-builder';

// AS / AT / AF / AE / AX — Alert History: statistics cards, the timeline
// (graph + table + pagination), filtering, error/empty states, and the
// cross-cutting guarantees of the v2 history API migration.
//
// Two rules run through every assertion here:
//
//  1. **A payload shape is not a rendered assertion.** Every card in
//     `Statistics/` sits behind a `has*Stats()` or `timeSeries.length > 1` gate
//     that a raw API response says nothing about, so the card scenarios assert
//     the *rendered* variant (`data-empty`, the literal empty message), not the
//     JSON.
//  2. **The timeline graph is a uPlot `<canvas>`** — there is no per-segment DOM
//     node and no per-state class. Graph coverage is therefore the
//     `overall_status` response body, the title text, "the canvas mounted", and
//     a clean console. Never pixels, never segment locators.

// ─── Local helpers ───────────────────────────────────────────────────────

const HISTORY_ENDPOINTS = [
	'stats',
	'timeline',
	'top_contributors',
	'overall_status',
] as const;

function isHistoryRequest(
	request: Request,
	endpoint: (typeof HISTORY_ENDPOINTS)[number],
): boolean {
	return new RegExp(`/api/v2/rules/[^/]+/history/${endpoint}`).test(
		request.url(),
	);
}

/** Every request the page issued, captured from before the first navigation. */
function collectRequests(page: Page): Request[] {
	const requests: Request[] = [];
	page.on('request', (request) => requests.push(request));
	return requests;
}

/** Apply a filter expression through the real editor + Run button. */
async function runExpression(page: Page, expression: string): Promise<void> {
	await typeExpression(page, expression);
	await page.getByRole('button', { name: /run query/i }).click();
}

function timelineRequestUrl(request: Request): URL {
	return new URL(request.url());
}

/**
 * Sort the timeline descending through the STATE header.
 *
 * The antd table is *uncontrolled* — it has `sorter: true` but no `sortOrder`,
 * so its internal cycle is none → ascend → descend regardless of the `order`
 * the hook already sends. Reaching `desc` therefore takes two clicks, and the
 * first one only resets the page (asc is nuqs's default, so it writes no param).
 */
async function sortTimelineDescending(page: Page): Promise<void> {
	const header = page.getByRole('columnheader', { name: 'STATE' });
	const descRequest = page.waitForRequest(
		(req) =>
			isHistoryRequest(req, 'timeline') &&
			timelineRequestUrl(req).searchParams.get('order') === 'desc',
	);
	await header.click();
	await header.click();
	await descRequest;
}

/**
 * Snapshot the LABELS cell of every rendered row. Scenarios that compare two
 * snapshots taken at different times (page 1 vs page 2, one timezone vs
 * another) cannot express that as a web-first assertion, so the read lives in a
 * helper rather than inline in the test.
 */
async function rowLabelSnapshot(page: Page): Promise<string[]> {
	return timelineRows(page).getByTestId('timeline-row-labels').allInnerTexts();
}

/** Snapshot the first row's CREATED AT cell. See {@link rowLabelSnapshot}. */
async function firstRowCreatedAt(page: Page): Promise<string> {
	return timelineRows(page)
		.first()
		.getByTestId('timeline-row-created-at')
		.innerText();
}

// ═════════════════════════════════════════════════════════════════════════
// AS — Statistics
// ═════════════════════════════════════════════════════════════════════════

test.describe('Alert history — statistics', () => {
	test('AS-01 Total Triggered card shows the firing count', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = statsCard(page, 'Total Triggered');
		await expect(card).toBeVisible();
		await expect(card).toHaveAttribute('data-empty', 'false');
		// `stats.totalCurrentTriggers` is the **firing** count, not the timeline
		// row count. They coincide on SEED-A (25 firing, 0 resolved); AS-12 is the
		// scenario that separates them.
		await expect(card.getByTestId('stats-card-value')).toHaveText(
			String(alertHistory.total),
		);
	});

	test('AS-02 Avg. Resolution Time card is empty with no resolutions', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = statsCard(page, 'Avg. Resolution Time');
		await expect(card).toBeVisible();
		// `currentAvgResolutionTime: 0` ⇒ `hasAvgResolutionTimeStats` false ⇒
		// StatsCardsRenderer renders the *empty* card. It does **not** format a
		// zero duration — `formatTime` is never called.
		await expect(card).toHaveAttribute('data-empty', 'true');
		const value = card.getByTestId('stats-card-value');
		await expect(value).toHaveText('No Resolutions.');
		await expect(value).not.toHaveText(/NaN/);
		await expect(card.getByTestId('stats-card-sparkline')).toHaveCount(0);
	});

	test('AS-03 an empty card never renders a sparkline', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// `StatsCard` gates `StatsGraph` on `!isEmpty && timeSeries.length > 1`, so
		// the empty Avg. Resolution card has no sparkline whatever its series looks
		// like. AS-03b covers the other side of the gate.
		const empty = statsCard(page, 'Avg. Resolution Time');
		await expect(empty).toHaveAttribute('data-empty', 'true');
		await expect(empty.getByTestId('stats-card-sparkline')).toHaveCount(0);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AS-03b sparkline present with a multi-point series', async () => {
		test.skip(
			true,
			'Not deterministic on SEED-A: whether `currentTriggersSeries` lands in ' +
				'one stats bucket or two depends on where the ~2-minute seed falls ' +
				'relative to the bucket boundary, so the `timeSeries.length > 1` gate ' +
				'flips between runs (observed both ways). Needs a fixture that ' +
				'guarantees ≥2 points — see coverage doc §3.5.',
		);
	});

	test('AS-04 change-vs-past indicator reads "no previous data"', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// `totalPastTriggers: 0` ⇒ `calculateChange` direction 0 ⇒ the
		// `change-percentage--no-previous-data` branch, which is a literal string
		// rather than a percentage.
		const card = statsCard(page, 'Total Triggered');
		await expect(card.getByTestId('stats-card-change')).toHaveText(
			'no previous data',
		);
	});

	test('AS-05 top contributors card caps at three rows', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const card = page.getByTestId('top-contributors-card');
		await expect(card).toBeVisible();
		await expect(card).toContainText('top contributors');

		// `TopContributorsContent` slices to 3. Do **not** assert *which* services
		// or their order: SEED-A's 25 contributors are all tied at count 1.
		const rows = card.getByTestId('top-contributors-row');
		await expect(rows).toHaveCount(3);
		for (let i = 0; i < 3; i += 1) {
			await expect(
				rows.nth(i).getByTestId('top-contributors-row-count'),
			).toHaveText(`1/${alertHistory.total}`);
			await expect(rows.nth(i)).toContainText('service.name');
		}
	});

	test('AS-06 "View all" appears only above three contributors', async ({
		authedPage: page,
		alertHistory,
		metricsHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(page.getByTestId('top-contributors-view-all')).toBeVisible();

		// SEED-E has 2 contributors, below the `length > 3` gate.
		await gotoAlertHistory(page, metricsHistory.ruleId);
		await expect(page.getByTestId('top-contributors-card')).toBeVisible();
		await expect(page.getByTestId('top-contributors-view-all')).toHaveCount(0);
	});

	test('AS-07 View-all drawer lists every contributor', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await page.getByTestId('top-contributors-view-all').click();

		const drawer = page.getByTestId('top-contributors-drawer');
		await expect(drawer).toBeVisible();
		await expect(page.getByText('Viewing All Contributors')).toBeVisible();
		// The drawer receives the *unsliced* array, but `TopContributorsRows`
		// switches its antd pagination on above 10 rows — so "all" means one
		// 10-row page plus a footer that reports the full total, not 25 rows in the
		// DOM at once.
		await expect(drawer.getByTestId('top-contributors-row')).toHaveCount(10);
		await expect(drawer.locator('.total')).toHaveText(
			` of ${alertHistory.total}`,
		);
	});

	test('AS-07b drawer opens from a deep link', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// The `useState` initialiser reads the param, so deep-linking works even
		// though clicking does not write it (AS-08).
		await gotoAlertHistory(page, alertHistory.ruleId, {
			viewAllTopContributors: 'true',
		});

		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
	});

	test('AS-08 View-all click writes ?viewAllTopContributors=true', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// `TopContributorsCard.toggleViewAllDrawer` mutates `searchParams` *inside*
		// the `setState` updater and pushes the serialised params immediately after,
		// which reads like it should push stale params. Verified live: it does not —
		// the push sees the mutated object because they are the same
		// `URLSearchParams` instance, not a copy. Keep the assertion so a refactor
		// that turns this into a real race is caught.
		await gotoAlertHistory(page, alertHistory.ruleId);
		await page.getByTestId('top-contributors-view-all').click();

		await expect(page).toHaveURL(/[?&]viewAllTopContributors=true/);
		await expect(page.getByTestId('top-contributors-drawer')).toBeVisible();
	});

	test('AS-09 stats follow the time range', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// A window that closes before the seed was written ⇒ both cards flip to
		// their empty variants.
		const end = Date.now() - 24 * 60 * 60 * 1000;
		const start = end - 30 * 60 * 1000;
		await gotoAlertHistory(page, alertHistory.ruleId, {
			startTime: String(start),
			endTime: String(end),
		});

		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText('None Triggered.');
		await expect(
			statsCard(page, 'Avg. Resolution Time').getByTestId('stats-card-value'),
		).toHaveText('No Resolutions.');

		// Widening it back brings the values back.
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText(String(alertHistory.total));
	});

	test('AS-10 contributor rows expose the related-logs link', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// The popover wraps each *cell*, not the row — clicking the `<tr>` only
		// fires the row's `logEvent`.
		await page
			.getByTestId('top-contributors-card')
			.getByTestId('top-contributors-row')
			.first()
			.getByTestId('top-contributors-row-count')
			.click();

		// A logs-based rule ⇒ View Logs only, no View Traces.
		await expect(page.getByTestId('alert-popover-view-logs')).toBeVisible();
		await expect(page.getByTestId('alert-popover-view-traces')).toHaveCount(0);
	});

	test('AS-11 avg resolution time renders a real duration', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId);

		const card = statsCard(page, 'Avg. Resolution Time');
		await expect(card).toHaveAttribute('data-empty', 'false');
		// `formatTime` output, not the SEED-A `"No Resolutions."` string.
		await expect(card.getByTestId('stats-card-value')).not.toHaveText(
			'No Resolutions.',
		);
		await expect(card.getByTestId('stats-card-value')).not.toHaveText('');
		// Still no sparkline: the resolution series has one point and the gate is
		// `> 1` (AS-03).
		await expect(card.getByTestId('stats-card-sparkline')).toHaveCount(0);
	});

	test('AS-12 Total Triggered counts firing rows only', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId);

		// The table holds firing **and** resolved rows, but the card counts only
		// the firing ones — this is the guard against counting all states.
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toHaveText(String(resolvedHistory.firingCount));
		await expect(timelineRows(page)).toHaveCount(
			resolvedHistory.firingCount + resolvedHistory.resolvedCount,
		);
	});
});

// ═════════════════════════════════════════════════════════════════════════
// AT — Timeline: graph, tabs, table, pagination
// ═════════════════════════════════════════════════════════════════════════

test.describe('Alert history — timeline', () => {
	test('AT-01 timeline section chrome renders', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(page.locator('.timeline__title')).toHaveText('Timeline');
		await expect(page.getByTestId('timeline-tab-overall-status')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-all')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-fired')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-resolved')).toBeVisible();
		await expect(page.getByTestId('timeline-graph')).toBeVisible();
		await expect(page.getByTestId('timeline-table')).toBeVisible();
	});

	test('AT-02 Top 5 Contributors tab is disabled with a Coming Soon pill', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// Known behaviour — the second timeline tab is not built yet.
		const tab = page.getByTestId('timeline-tab-top-contributors');
		await expect(tab).toBeDisabled();
		await expect(tab).toContainText('Coming Soon');
	});

	test('AT-03 graph renders for a two-segment history', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// Register before navigating — an unmapped alert state makes
		// `TIMELINE_OPTIONS.fill` index `STATE_VS_COLOR[1][undefined]` and throw
		// during paint rather than render anything visibly wrong.
		const watch = watchConsole(page);

		const statusPromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'overall_status'),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		const status = await statusPromise;

		// (a) the response body — the only place segments are observable.
		const body = (await status.json()) as {
			data: { state: string }[] | null;
		};
		const states = (body.data ?? []).map((segment) => segment.state);
		expect(states).toEqual(['inactive', 'firing']);

		// (b) the canvas mounted...
		await expect(page.getByTestId('timeline-graph')).toBeVisible();
		await expect(
			page.getByTestId('timeline-graph').locator('canvas'),
		).toBeVisible();

		// (c) ...and the title is the one DOM-assertable fact about the graph.
		await expect(page.getByTestId('timeline-graph-title')).toHaveText(
			`${alertHistory.total} triggers in ${DEFAULT_RELATIVE_TIME}`,
		);

		// (d) nothing threw during paint.
		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});

	test('AT-03b graph renders for a three-segment history', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		// Register before navigating — an unmapped alert state makes
		// `TIMELINE_OPTIONS.fill` index `STATE_VS_COLOR[1][undefined]` and throw
		// during paint rather than render anything visibly wrong.
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

	test('AT-04 table baseline', async ({ authedPage: page, alertHistory }) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);

		const first = timelineRows(page).first();
		await expect(first.getByTestId('timeline-row-state')).toHaveText('Firing');
		await expect(first.getByTestId('timeline-row-labels')).toContainText(
			'service.name',
		);
		// `DATE_TIME_FORMATS.DASH_DATETIME` — "MMM D, YYYY ⎯ HH:mm:ss".
		await expect(first.getByTestId('timeline-row-created-at')).toHaveText(
			/^[A-Z][a-z]{2} \d{1,2}, \d{4} ⎯ \d{2}:\d{2}:\d{2}$/,
		);
	});

	test('AT-05 footer range', async ({ authedPage: page, alertHistory }) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('AT-06 next page sends the expected cursor', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const firstPageLabels = await rowLabelSnapshot(page);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-next-page').click();
		const request = await requestPromise;

		expect(timelineRequestUrl(request).searchParams.get('cursor')).toBe(
			encodeTimelineCursor(2),
		);
		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
		await expect(timelineFooterRange(page)).toHaveText(
			`${TIMELINE_PAGE_SIZE + 1} — ${alertHistory.total} of ${alertHistory.total}`,
		);
		await expect(page.getByTestId('timeline-prev-page')).toBeEnabled();

		// A cursor regression would silently re-serve page 1, so assert the rows
		// actually moved.
		expect(await rowLabelSnapshot(page)).not.toEqual(firstPageLabels);
	});

	test('AT-07 prev page drops the cursor', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-prev-page').click();
		const request = await requestPromise;

		expect(timelineRequestUrl(request).searchParams.get('cursor')).toBeNull();
		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('AT-08 pagination buttons disable at the ends', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(page.getByTestId('timeline-prev-page')).toBeDisabled();
		await expect(page.getByTestId('timeline-next-page')).toBeEnabled();

		await page.getByTestId('timeline-next-page').click();

		// Page 2 is the last page, so the server returns no `nextCursor`.
		await expect(page.getByTestId('timeline-next-page')).toBeDisabled();
		await expect(page.getByTestId('timeline-prev-page')).toBeEnabled();
	});

	test('AT-09 browser back after paging', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await page.getByTestId('timeline-next-page').click();
		await expect(page).toHaveURL(/[?&]page=2/);

		// nuqs is configured with `history: 'push'`, so back is a real history step.
		await page.goBack();

		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('AT-10 deep-link ?page=2', async ({ authedPage: page, alertHistory }) => {
		const requestPromise = page.waitForRequest(
			(req) =>
				isHistoryRequest(req, 'timeline') &&
				timelineRequestUrl(req).searchParams.get('cursor') ===
					encodeTimelineCursor(2),
		);
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });
		await requestPromise;

		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
	});

	test('AT-11 default order is asc', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		const request = await requestPromise;

		// The URL omits the default (nuqs `withDefault('asc')`) ...
		expect(new URL(page.url()).searchParams.get('order')).toBeNull();
		// ... but the request always carries it: `hooks.tsx` maps the hook value to
		// `Querybuildertypesv5OrderDirectionDTO` unconditionally. Known behaviour.
		expect(timelineRequestUrl(request).searchParams.get('order')).toBe('asc');

		// The "rows oldest-first" half of this scenario is **not** assertable on
		// SEED-A: all 25 rows come from one evaluation and share a single
		// `unixMilli`, so within-page order varies run to run. It needs SEED-D's
		// distinct timestamps — coverage doc §3.5.
	});

	test('AT-12 sorting toggles order and resets the page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		await sortTimelineDescending(page);

		await expect(page).toHaveURL(/[?&]order=desc/);
		await expectFirstPage(page);
	});

	test('AT-13 single page hides pagination noise', async ({
		authedPage: page,
		metricsHistory,
	}) => {
		await gotoAlertHistory(page, metricsHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(metricsHistory.total);
		await expect(page.getByTestId('timeline-prev-page')).toBeDisabled();
		await expect(page.getByTestId('timeline-next-page')).toBeDisabled();
		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${metricsHistory.total} of ${metricsHistory.total}`,
		);
	});

	test('AT-14 row click does not navigate', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const before = page.url();

		// The row handler only fires a `logEvent`.
		await timelineRows(page).first().click();

		expect(page.url()).toBe(before);
		await expect(page.getByTestId('timeline-table')).toBeVisible();
	});

	test('AT-15 related links per row', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await timelineRows(page).first().getByTestId('timeline-row-actions').click();

		const viewLogs = page.getByTestId('alert-popover-view-logs');
		await expect(viewLogs).toBeVisible();
		await viewLogs.click();

		await expect(page).toHaveURL(/\/logs\/logs-explorer/);
		const search = new URL(page.url()).searchParams;
		expect(search.get('startTime')).toBeTruthy();
		expect(search.get('endTime')).toBeTruthy();
		expect(page.url()).toContain('compositeQuery');
	});

	test('AT-16 rows without links show a disabled action', async ({
		authedPage: page,
		metricsHistory,
	}) => {
		await gotoAlertHistory(page, metricsHistory.ruleId);

		// A metrics rule's rows carry neither `relatedLogsLink` nor
		// `relatedTracesLink` — links are derived from the rule's signal.
		const action = timelineRows(page).first().getByTestId('timeline-row-actions');
		await expect(action).toBeDisabled();

		// The "No links available for this item" tooltip is **not assertable**:
		// antd 5 does not wrap a disabled Tooltip child, and a disabled antd Button
		// carries `pointer-events: none`, so no hover ever reaches the trigger.
		// Verified live — the tooltip never appears. What *is* assertable is that
		// the action is inert: disabled, with no popover links anywhere.
		await expect(page.getByTestId('alert-popover-view-logs')).toHaveCount(0);
		await expect(page.getByTestId('alert-popover-view-traces')).toHaveCount(0);
	});

	test('AT-17 CREATED AT respects the app timezone', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const utcCell = await firstRowCreatedAt(page);

		// The provider reads `PREFERRED_TIMEZONE` from localStorage on mount.
		await page.addInitScript(() =>
			localStorage.setItem('PREFERRED_TIMEZONE', 'Asia/Kolkata'),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);

		expect(await firstRowCreatedAt(page)).not.toBe(utcCell);
	});

	test('AT-18 alert states that render', async ({
		authedPage: page,
		resolvedHistory,
		noDataHistory,
	}) => {
		// `firing` and `inactive` both appear on SEED-F.
		await gotoAlertHistory(page, resolvedHistory.ruleId);
		const stateCells = timelineRows(page).getByTestId('timeline-row-state');
		const labels = [...new Set(await stateCells.allInnerTexts())];
		expect(labels).toContain('Firing');
		expect(labels).toContain('Resolved');

		// `nodata` comes from SEED-G.
		await gotoAlertHistory(page, noDataHistory.ruleId);
		await expect(
			timelineRows(page).getByTestId('timeline-row-state').first(),
		).toHaveText('No Data');

		// The fourth `case` arm, `disabled` → "Muted", needs a row written in that
		// state, which no ruler-driven fixture produces — see AT-18c.
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AT-18b pending / recovering render blank', async () => {
		test.skip(
			true,
			'Needs SEED-D (coverage doc §3.5): `pending` and `recovering` are ' +
				'transient states no cheap fixture produces. AlertState.tsx has no ' +
				'`case` for either, so both hit `default` and the STATE cell renders ' +
				'empty — write this as a bug-catch once the seeder endpoint exists.',
		);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AT-18c disabled state renders as "Muted"', async () => {
		test.skip(
			true,
			'Needs SEED-D (coverage doc §3.5): a `disabled` history row is ' +
				'policy-driven and the ruler never writes one for a rule we disable ' +
				'(verified: disabling appends no row).',
		);
	});

	test('AT-19 graph handles a nodata history', async ({
		authedPage: page,
		noDataHistory,
	}) => {
		// Register before navigating — an unmapped alert state makes
		// `TIMELINE_OPTIONS.fill` index `STATE_VS_COLOR[1][undefined]` and throw
		// during paint rather than render anything visibly wrong.
		const watch = watchConsole(page);

		const statusPromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'overall_status'),
		);
		await gotoAlertHistory(page, noDataHistory.ruleId);
		const status = await statusPromise;

		const body = (await status.json()) as { data: { state: string }[] | null };
		// `overall_status` reports the rule's *overall* state, which for an
		// alert-on-absent rule is `firing` — the `nodata` value only shows up on the
		// per-fingerprint timeline rows (AT-18). Verified live: the segments here are
		// `inactive` → `firing`. So assert every segment is a state `ALERT_STATUS`
		// knows about, since an unmapped value is the actual failure mode.
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

		// `ALERT_STATUS` maps every DTO value to a lane and `STATE_VS_COLOR[1]`
		// has a colour for each, so nothing blanks. The failure mode being guarded
		// is a *new* state value with no entry, which throws inside
		// `TIMELINE_OPTIONS.fill` — hence the console assertion, not a DOM one.
		await expect(
			page.getByTestId('timeline-graph').locator('canvas'),
		).toBeVisible();
		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AT-20 time-range boundaries are inclusive/exclusive as expected', async () => {
		test.skip(
			true,
			'Needs SEED-D (coverage doc §3.5): asserting a row exactly at `start` ' +
				'and one at `start-1ms` requires controlling the row timestamps, and ' +
				'evaluation times are whatever the ruler chose.',
		);
	});

	test('AT-21 pages together cover the whole set', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const pageOne = await rowLabelSnapshot(page);

		await page.getByTestId('timeline-next-page').click();
		await expect(timelineRows(page)).toHaveCount(
			alertHistory.total - TIMELINE_PAGE_SIZE,
		);
		const pageTwo = await rowLabelSnapshot(page);

		const union = new Set([...pageOne, ...pageTwo]);
		expect(pageOne.length + pageTwo.length).toBe(alertHistory.total);
		expect(union.size).toBe(alertHistory.total);
	});
});

// ═════════════════════════════════════════════════════════════════════════
// AF — Filtering: state filter + QuerySearch expression + suggestions
// ═════════════════════════════════════════════════════════════════════════

test.describe('Alert history — filtering', () => {
	test('AF-01 All filter sends no state param', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
		});

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-filter-all').click();
		const request = await requestPromise;

		await expect(page).toHaveURL(/[?&]timelineFilter=ALL/);
		expect(timelineRequestUrl(request).searchParams.get('state')).toBeNull();
	});

	test('AF-02 Fired filter sends state=firing', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-filter-fired').click();
		const request = await requestPromise;

		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);
		expect(timelineRequestUrl(request).searchParams.get('state')).toBe('firing');
		await expect(timelineRows(page).first()).toBeVisible();
	});

	test('AF-03 Resolved filter is empty for a freshly-evaluated rule', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByTestId('timeline-filter-resolved').click();
		const request = await requestPromise;

		// Known behaviour: SEED-A is frozen before it can resolve.
		await expect(page).toHaveURL(/[?&]timelineFilter=RESOLVED/);
		expect(timelineRequestUrl(request).searchParams.get('state')).toBe(
			'inactive',
		);
		await expect(timelineRows(page)).toHaveCount(0);
	});

	test('AF-03b Resolved filter is populated on a resolved rule', async ({
		authedPage: page,
		resolvedHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId, {
			timelineFilter: 'RESOLVED',
		});

		await expect(timelineRows(page)).toHaveCount(resolvedHistory.resolvedCount);
		for (const text of await timelineRows(page)
			.getByTestId('timeline-row-state')
			.allInnerTexts()) {
			expect(text).toBe('Resolved');
		}

		await page.getByTestId('timeline-filter-fired').click();
		await expect(timelineRows(page)).toHaveCount(resolvedHistory.firingCount);
	});

	test('AF-04 filter deep-link starts on that tab', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
		});

		await expect(page.getByTestId('timeline-filter-fired')).toHaveClass(
			/selected/,
		);
		await expect(timelineRows(page).first()).toBeVisible();
	});

	test('AF-05 state filter resets the page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		await page.getByTestId('timeline-filter-fired').click();

		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expectFirstPage(page);
	});

	test('AF-06 key suggestions load before first use', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const keysPromise = page.waitForResponse((res) =>
			/\/history\/filter_keys/.test(res.url()),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		const keysResponse = await keysPromise;

		// The editor is gated on the keys having arrived, so the skeleton clears
		// only once this resolves. Assert the *response* rather than the CodeMirror
		// dropdown DOM — the editor is a rich widget and its option list is not a
		// stable contract.
		const body = (await keysResponse.json()) as {
			data: { keys: Record<string, { name: string }[]> } | null;
		};
		expect(Object.keys(body.data?.keys ?? {}).sort()).toEqual([
			'service.name',
			'severity',
			'threshold.name',
		]);
		// `filter_keys` / `filter_values` take `startUnixMilli` / `endUnixMilli`,
		// not `start` / `end` (AX-08).
		const params = new URL(keysResponse.url()).searchParams;
		expect(params.get('startUnixMilli')).toBeTruthy();
		expect(params.get('endUnixMilli')).toBeTruthy();

		await expect(page.getByTestId('timeline-filter-search')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-skeleton')).toHaveCount(0);
	});

	test('AF-07 value suggestions come from the override', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const valuesPromise = page.waitForResponse((res) =>
			/\/history\/filter_values/.test(res.url()),
		);
		await typeExpression(page, "service.name = '");
		const valuesResponse = await valuesPromise;

		const params = new URL(valuesResponse.url()).searchParams;
		expect(params.get('name')).toBe('service.name');

		const body = (await valuesResponse.json()) as {
			data: { values?: { stringValues?: string[] }; complete?: boolean } | null;
		};
		expect(body.data?.values?.stringValues).toEqual(
			[...alertHistory.services].sort(),
		);
		expect(body.data?.complete).toBe(true);
	});

	test('AF-08 value suggestions honour the typed text', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// The first fetch comes back `complete: true`, and QuerySearch only re-queries
		// when the current search text has no matching suggestion left — so typing
		// narrows the list **client-side** and issues no second request. Verified
		// live. That makes the rendered option list the only observable, so this is
		// the one filtering scenario that has to touch the editor's dropdown.
		await typeExpression(page, "service.name = 'svc-1");

		const options = page.locator('.cm-tooltip-autocomplete li');
		await expect(options.first()).toBeVisible();
		const texts = await options.allInnerTexts();
		expect(texts.length).toBeGreaterThan(0);
		expect(texts.length).toBeLessThan(alertHistory.services.length);
		for (const text of texts) {
			expect(text).toContain('svc-1');
		}
	});

	test('AF-09 running an equality expression filters the table', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const service = alertHistory.services[3];

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await runExpression(page, `service.name = '${service}'`);
		const request = await requestPromise;

		expect(timelineRequestUrl(request).searchParams.get('filterExpression')).toBe(
			`service.name = '${service}'`,
		);
		await expect(timelineRows(page)).toHaveCount(1);
		await expect(page).toHaveURL(/[?&]alertHistoryExpression=/);
	});

	test('AF-10 expression resets the page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });

		await runExpression(page, `service.name = '${alertHistory.services[0]}'`);

		await expect(page).not.toHaveURL(/[?&]page=2/);
		await expectFirstPage(page);
	});

	test('AF-11 Run re-fetches an unchanged expression', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const expression = `service.name = '${alertHistory.services[1]}'`;
		await runExpression(page, expression);
		await expect(timelineRows(page)).toHaveCount(1);

		// Same text again ⇒ `handleRunQuery` takes the `refetch()` branch.
		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await page.getByRole('button', { name: /run query/i }).click();
		await requestPromise;

		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('AF-12 an in-flight query can be cancelled', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// Slow the timeline down so the Cancel affordance is reachable.
		await page.route(
			(url) => /\/history\/timeline/.test(url.pathname),
			async (route) => {
				await new Promise((resolve) => {
					setTimeout(resolve, 3_000);
				});
				await route.continue();
			},
		);

		await typeExpression(page, `service.name = '${alertHistory.services[2]}'`);
		await page.getByRole('button', { name: /run query/i }).click();

		const cancel = page.getByRole('button', { name: 'Cancel' });
		await expect(cancel).toBeVisible();
		await cancel.click();

		await page.unrouteAll({ behavior: 'ignoreErrors' });
		// Loading state clears — no stuck spinner.
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /run query/i })).toBeVisible();
	});

	test('AF-13 rule-metadata keys are filterable', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		// The v2 rule's threshold is named `critical` and its `labels.severity` is
		// `critical`, so both match every row.
		await runExpression(page, `threshold.name = 'critical'`);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);

		await runExpression(page, `severity = 'critical'`);
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);

		// The legacy rule derives its threshold name from `labels.severity`, which
		// SEED-C sets to `warning` — so `critical` matches nothing there.
		await gotoAlertHistory(page, alertHistory.ruleIdV1);
		await runExpression(page, `threshold.name = 'warning'`);
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.totalV1}`,
		);

		await runExpression(page, `threshold.name = 'critical'`);
		await expect(timelineRows(page)).toHaveCount(0);
	});

	test('AF-14 an unknown key does not 500', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const responsePromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'timeline'),
		);
		await runExpression(page, `nonexistent.key = 'x'`);
		const response = await responsePromise;

		// The `store.go` per-selector fallback keeps this a 200-with-zero-rows.
		expect(response.status()).toBe(200);
		await expect(timelineRows(page)).toHaveCount(0);
		await expect(page.getByTestId('timeline-error')).toHaveCount(0);
	});

	test('AF-15 expression across an Overview → History round-trip', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const expression = `service.name = '${alertHistory.services[4]}'`;
		await runExpression(page, expression);
		await expect(timelineRows(page)).toHaveCount(1);
		await expect(page).toHaveURL(/[?&]alertHistoryExpression=/);

		await page.getByTestId('alert-details-tab-overview').click();
		await page.getByTestId('alert-details-tab-history').click();

		// KNOWN BEHAVIOUR, and arguably a bug: `useRouteTabUtils` rebuilds the
		// History tab's search as literally `ruleId=…&relativeTime=…`, so
		// `alertHistoryExpression` is dropped (see AD-05b), and
		// `QuerySearchV2Provider`'s `persistOnUnmount` does **not** bring it back —
		// verified live, the table returns to the unfiltered set. Locked in as-is so
		// that either fixing the tab URL or fixing the provider fails here loudly.
		await expect(page.getByTestId('timeline-table')).toBeVisible();
		expect(new URL(page.url()).searchParams.has('alertHistoryExpression')).toBe(
			false,
		);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
	});

	test('AF-16 expression and state filter compose', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			timelineFilter: 'FIRED',
		});

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		const service = alertHistory.services[5];
		await runExpression(page, `service.name = '${service}'`);
		const request = await requestPromise;

		const params = timelineRequestUrl(request).searchParams;
		expect(params.get('state')).toBe('firing');
		expect(params.get('filterExpression')).toBe(`service.name = '${service}'`);
		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('AF-17 clearing the expression restores the full list', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await runExpression(page, `service.name = '${alertHistory.services[6]}'`);
		await expect(timelineRows(page)).toHaveCount(1);

		const requestPromise = page.waitForRequest((req) =>
			isHistoryRequest(req, 'timeline'),
		);
		await runExpression(page, '');
		const request = await requestPromise;

		expect(
			timelineRequestUrl(request).searchParams.get('filterExpression'),
		).toBeNull();
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);
	});
});

// ═════════════════════════════════════════════════════════════════════════
// AE — Error, empty and edge states
// ═════════════════════════════════════════════════════════════════════════

test.describe('Alert history — error and empty states', () => {
	test('AE-01 invalid filter expression surfaces the table error', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const responsePromise = page.waitForResponse((res) =>
			isHistoryRequest(res.request(), 'timeline'),
		);
		// A syntactically invalid expression 400s with `invalid_input` — exactly
		// the shape `ErrorContent` renders. Typing it is a real user action, which
		// is why this is the honest route to the error state rather than faking a
		// bogus rule id (that never reaches the history APIs at all — AE-02b).
		await runExpression(page, 'service.name =');
		const response = await responsePromise;
		expect(response.status()).toBe(400);

		const error = page.getByTestId('timeline-error');
		await expect(error).toBeVisible();
		await expect(error).toContainText(/syntax error/i);

		// The page stays usable and fixing the expression recovers.
		await runExpression(page, `service.name = '${alertHistory.services[7]}'`);
		await expect(page.getByTestId('timeline-error')).toHaveCount(0);
		await expect(timelineRows(page)).toHaveCount(1);
	});

	test('AE-02 no key suggestions when keys are unavailable', async ({
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

		// Known behaviour (9f16b6c37b): `hardcodedAttributeKeys` returns `[]`, not
		// `undefined`, so the skeleton clears and the editor still mounts and stays
		// typable — there are simply no suggestions.
		await expect(page.getByTestId('timeline-filter-skeleton')).toHaveCount(0);
		await expect(page.getByTestId('timeline-filter-search')).toBeVisible();
		await typeExpression(page, 'anything.at.all');
		await expect(
			page.locator('.query-where-clause-editor .cm-content'),
		).toContainText('anything.at.all');
	});

	test('AE-02b a bogus ruleId never reaches the history APIs', async ({
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

	test('AE-03 a rule with no history yet renders empty, not broken', async ({
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

	test('AE-04 a time range with no data renders empty', async ({
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

	test('AE-05 a time-range change resets the page', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);

		// Regression guard for 8c5b110bd4 — the `filtersKey` effect includes the
		// resolved start/end, so changing the range *in place* sends the table back
		// to page 1. It has to be an in-page change: on a fresh load the effect's
		// ref is seeded with the current key and nothing resets.
		await page.locator('.filters input').first().click();
		await page.getByText('Last 6 hours', { exact: true }).click();

		await expectFirstPage(page);
	});

	test('AE-06 an absurd time range still renders', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, { relativeTime: '90d' });

		await expect(page.getByTestId('timeline-table')).toBeVisible();
		await expect(timelineRows(page).first()).toBeVisible();
		// GraphWrapper interpolates `relativeTime` straight off the URL, so match
		// on the leading count rather than the whole string.
		await expect(page.getByTestId('timeline-graph-title')).toContainText(
			`${alertHistory.total} triggers in`,
		);
	});

	test('AE-07 a disabled rule’s history is still readable', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// SEED-A is frozen (`disabled: true`) as part of the fixture, so this is
		// the state every other history scenario reads from — assert it explicitly
		// so a regression that hides history for disabled rules fails loudly here.
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(timelineFooterRange(page)).toContainText(
			`of ${alertHistory.total}`,
		);
	});

	test('AE-08 a deleted rule renders AlertNotFound', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// Seed a throwaway rule against SEED-A's marker and channel, confirm its
		// history route mounts, then delete it and revisit the same URL. Never
		// touch the shared fixture's rule.
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

// ═════════════════════════════════════════════════════════════════════════
// AX — Cross-cutting
// ═════════════════════════════════════════════════════════════════════════

test.describe('Alert history — cross-cutting', () => {
	test('AX-01 a full deep-link is honoured in one load', async ({
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

	test('AX-02 reload preserves every history param', async ({
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

	test('AX-03 back/forward restores the matching table state', async ({
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

	test('AX-04 no unhandled console errors across the whole history flow', async ({
		authedPage: page,
		alertHistory,
	}) => {
		// Register before navigating — an unmapped alert state makes
		// `TIMELINE_OPTIONS.fill` index `STATE_VS_COLOR[1][undefined]` and throw
		// during paint rather than render anything visibly wrong.
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

	test('AX-05 no request storm on mount', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requests = collectRequests(page);

		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);
		await expect(
			statsCard(page, 'Total Triggered').getByTestId('stats-card-value'),
		).toBeVisible();

		// `refetchOnMount: false` on every history query ⇒ exactly one call each.
		for (const endpoint of HISTORY_ENDPOINTS) {
			const calls = requests.filter((req) => isHistoryRequest(req, endpoint));
			expect(calls, `${endpoint} called exactly once on mount`).toHaveLength(1);
		}
	});

	test('AX-06 v1 and v2 rules work side by side', async ({
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

	test('AX-07 no legacy history API calls', async ({
		authedPage: page,
		alertHistory,
	}) => {
		const requests = collectRequests(page);

		// One full history session: load, filter, paginate, sort, range change.
		await gotoAlertHistory(page, alertHistory.ruleId);
		await page.getByTestId('timeline-filter-fired').click();
		await page.getByTestId('timeline-next-page').click();
		await expect(page).toHaveURL(/[?&]page=2/);
		await sortTimelineDescending(page);
		await expect(page).toHaveURL(/[?&]order=desc/);
		await gotoAlertHistory(page, alertHistory.ruleId, { relativeTime: '6h' });

		// The v1 routes are still live server-side, so this is a real regression
		// guard rather than a tautology.
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

	test('AX-08 history endpoints carry the expected params', async ({
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
		const timelineParams = timelineRequestUrl(timeline!).searchParams;
		for (const key of ['start', 'end', 'limit', 'order', 'cursor', 'state']) {
			expect(timelineParams.get(key), `timeline carries ${key}`).toBeTruthy();
		}
		expect(timelineParams.get('limit')).toBe(String(TIMELINE_PAGE_SIZE));
		expect(timelineParams.get('cursor')).toBe(encodeTimelineCursor(2));

		// `stats` / `overall_status` / `top_contributors` use `start` / `end`...
		for (const endpoint of [
			'stats',
			'overall_status',
			'top_contributors',
		] as const) {
			const request = requests
				.filter((req) => isHistoryRequest(req, endpoint))
				.pop();
			expect(request, `${endpoint} was requested`).toBeDefined();
			const params = timelineRequestUrl(request!).searchParams;
			expect(params.get('start'), `${endpoint} carries start`).toBeTruthy();
			expect(params.get('end'), `${endpoint} carries end`).toBeTruthy();
		}

		// ...while the suggestion endpoints use `startUnixMilli` / `endUnixMilli`.
		// Different names on adjacent endpoints is an easy regression.
		const keys = requests
			.filter((req) => /\/history\/filter_keys/.test(req.url()))
			.pop();
		expect(keys, 'filter_keys was requested').toBeDefined();
		const keyParams = timelineRequestUrl(keys!).searchParams;
		expect(keyParams.get('startUnixMilli')).toBeTruthy();
		expect(keyParams.get('endUnixMilli')).toBeTruthy();
		expect(keyParams.get('start')).toBeNull();
	});
});
