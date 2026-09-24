import {
	expect,
	type Locator,
	type Page,
	type Request,
	type Response,
} from '@playwright/test';

import { authToken, requestUrl } from '../common';
import { typeExpression } from '../query-builder';

import {
	ALERT_HISTORY_PATH,
	DEFAULT_RELATIVE_TIME,
	TIMELINE_PAGE_SIZE,
	WAIT_TIMELINE_ENTRIES_DEFAULT,
	WAIT_TIMELINE_STATES_DEFAULT,
} from './constants';
import type { TimelineItem, TimelineResponse } from './types';

// ─── History API probes ──────────────────────────────────────────────────

/**
 * Read the timeline straight from the API. Used to gate on the ruler having
 * produced rows *before* a spec opens the UI — polling through the browser
 * would conflate "no rows yet" with "the table failed to render".
 */
export async function fetchTimeline(
	page: Page,
	ruleId: string,
	params: Record<string, string | number> = {},
): Promise<TimelineResponse> {
	const token = await authToken(page);
	const now = Date.now();
	const query = new URLSearchParams({
		start: String(now - 30 * 60 * 1000),
		end: String(now),
		limit: '100',
		order: 'asc',
		...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
	});
	const res = await page.request.get(
		`/api/v2/rules/${ruleId}/history/timeline?${query.toString()}`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!res.ok()) {
		throw new Error(
			`GET /api/v2/rules/${ruleId}/history/timeline ${res.status()}: ${await res.text()}`,
		);
	}
	const json = (await res.json()) as { data: TimelineResponse | null };
	return {
		items: json.data?.items ?? [],
		total: json.data?.total ?? 0,
		nextCursor: json.data?.nextCursor,
	};
}

function countStates(items: TimelineItem[]): Record<string, number> {
	return items.reduce<Record<string, number>>((acc, item) => {
		acc[item.state] = (acc[item.state] ?? 0) + 1;
		return acc;
	}, {});
}

/**
 * Poll until at least `min` rows in state `state` exist. Takes ~20-35s for the
 * logs fixture (the rule fires on the first evaluation that sees the data) and
 * ~10s for the metrics one, so budget generously — a timeout here means the
 * marker aged out of the eval window, not that the assertion is wrong.
 */
export async function waitForTimelineEntries(
	page: Page,
	ruleId: string,
	{
		min,
		state = 'firing',
		timeoutMs = WAIT_TIMELINE_ENTRIES_DEFAULT,
	}: { min: number; state?: string; timeoutMs?: number },
): Promise<TimelineResponse> {
	const deadline = Date.now() + timeoutMs;
	let last: TimelineResponse = { items: [], total: 0 };
	while (Date.now() < deadline) {
		// eslint-disable-next-line no-await-in-loop
		last = await fetchTimeline(page, ruleId);
		if (last.items.filter((item) => item.state === state).length >= min) {
			return last;
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise((resolve) => {
			setTimeout(resolve, 2_000);
		});
	}
	throw new Error(
		`timeline for rule ${ruleId} never reached ${min} '${state}' rows within ${timeoutMs}ms ` +
			`(last: total=${last.total}, states=${JSON.stringify(countStates(last.items))})`,
	);
}

/**
 * Poll until every requested state has at least the requested row count.
 * SEED-F's firing→resolved wave and SEED-G's `nodata` row both gate on this.
 */
export async function waitForTimelineStates(
	page: Page,
	ruleId: string,
	{
		states,
		timeoutMs = WAIT_TIMELINE_STATES_DEFAULT,
	}: { states: Record<string, number>; timeoutMs?: number },
): Promise<TimelineResponse> {
	const deadline = Date.now() + timeoutMs;
	let last: TimelineResponse = { items: [], total: 0 };
	while (Date.now() < deadline) {
		// eslint-disable-next-line no-await-in-loop
		last = await fetchTimeline(page, ruleId);
		const seen = countStates(last.items);
		if (
			Object.entries(states).every(([state, min]) => (seen[state] ?? 0) >= min)
		) {
			return last;
		}
		// eslint-disable-next-line no-await-in-loop
		await new Promise((resolve) => {
			setTimeout(resolve, 3_000);
		});
	}
	throw new Error(
		`timeline for rule ${ruleId} never reached ${JSON.stringify(states)} within ${timeoutMs}ms ` +
			`(last states: ${JSON.stringify(countStates(last.items))})`,
	);
}

/** The filtered row count the timeline reports. Ignores `limit`. */
export async function readTimelineTotal(
	page: Page,
	ruleId: string,
): Promise<number> {
	return (await fetchTimeline(page, ruleId, { limit: 1 })).total;
}

/**
 * Mirror of `encodeCursor` in
 * `container/AlertHistory/Timeline/Table/useTimelineTableCursor.ts`, so specs
 * can assert the *exact* cursor the UI sends. Verified byte-identical to the
 * server's `nextCursor`.
 */
export function encodeTimelineCursor(
	page_: number,
	limit = TIMELINE_PAGE_SIZE,
): string | undefined {
	if (page_ <= 1) {
		return undefined;
	}
	const offset = (page_ - 1) * limit;
	return Buffer.from(JSON.stringify({ offset, limit }))
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/** Labels on a timeline row, flattened to a plain object. */
export function timelineLabelsToObject(
	item: TimelineItem,
): Record<string, string> {
	return (item.labels ?? []).reduce<Record<string, string>>((acc, label) => {
		const name = label.key?.name;
		if (name) {
			acc[name] = String(label.value ?? '');
		}
		return acc;
	}, {});
}

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Open the history tab for `ruleId` and wait until the timeline table has
 * mounted. `params` is merged into the query string, so scenarios can deep-link
 * `page`, `order`, `timelineFilter`, … in one call.
 */
export async function gotoAlertHistory(
	page: Page,
	ruleId: string,
	params: Record<string, string> = {},
): Promise<void> {
	// An absolute window and `relativeTime` are mutually exclusive in practice:
	// with both present the time picker normalises back to the relative range and
	// **drops** `startTime`/`endTime` from the URL, so the absolute window never
	// takes effect. Only send the default relative range when no absolute one was
	// asked for.
	const hasAbsoluteRange = !!params.startTime && !!params.endTime;
	const query = new URLSearchParams({
		ruleId,
		...(hasAbsoluteRange ? {} : { relativeTime: DEFAULT_RELATIVE_TIME }),
		...params,
	});
	await page.goto(`${ALERT_HISTORY_PATH}?${query.toString()}`);

	// Race the table against the app's error boundary. The history page has been
	// observed crashing into it intermittently on load; without this the failure
	// reads as a 15s "timeline-table not found", which says nothing about why.
	const table = page.getByTestId('timeline-table');
	const crashed = page.getByText('Something went wrong :/');
	await expect(table.or(crashed)).toBeVisible();
	if (await crashed.isVisible()) {
		throw new Error(
			`alert history crashed into the app error boundary at ${page.url()} — ` +
				'a component threw during render; check the captured console output',
		);
	}
	await expect(table).toBeVisible();

	// The `timeline-table` node is rendered by the first paint, *before* the
	// timeline request settles — antd only overlays a spinner on it. Returning
	// here would leave that request in flight, and the next
	// `waitForHistoryResponse` in the spec would resolve with the page's own
	// load instead of the response its interaction produced. Wait the spinner
	// out so every caller starts from a quiet page.
	await expect(page.locator('.timeline-table .ant-spin-spinning')).toHaveCount(
		0,
	);
}

// ─── Locators ──────────────────────────────────────────────────────────────

/**
 * Assert the table is back on page 1. Both the list and the timeline use nuqs
 * with `parseAsInteger.withDefault(1)`, which **removes** the `page` param when
 * it is reset rather than writing `page=1` — so "absent" and "1" are the same
 * state and a naive `?page=1` regex never matches.
 */
export async function expectFirstPage(page: Page): Promise<void> {
	await expect
		.poll(() => new URL(page.url()).searchParams.get('page') ?? '1')
		.toBe('1');
}

export function timelineRows(page: Page): Locator {
	return page.getByTestId('timeline-row');
}

export function timelineFooterRange(page: Page): Locator {
	return page.getByTestId('timeline-footer-range');
}

export function statsCard(page: Page, title: string): Locator {
	return page.locator(`[data-testid="stats-card"][data-stats-title="${title}"]`);
}

/** Open the ACTIONS popover on timeline row `index` (0-based). */
export async function openTimelineRowActions(
	page: Page,
	index: number,
): Promise<void> {
	await timelineRows(page)
		.nth(index)
		.getByTestId('timeline-row-actions')
		.click();
}

// ─── History request matchers ──────────────────────────────────────────────

/** The four v2 endpoints one history page load hits. */
export const HISTORY_ENDPOINTS = [
	'stats',
	'timeline',
	'top_contributors',
	'overall_status',
] as const;

export type HistoryEndpoint = (typeof HISTORY_ENDPOINTS)[number];

/** Match a request against one history endpoint, whatever the rule id. */
export function isHistoryRequest(
	request: Request,
	endpoint: HistoryEndpoint,
): boolean {
	return new RegExp(`/api/v2/rules/[^/]+/history/${endpoint}`).test(
		request.url(),
	);
}

/**
 * Wait for a history API response. Common pattern across history specs.
 *
 * Optionally narrow by HTTP status code or by the `filterExpression` the
 * request carried. The latter matters whenever a scenario reacts to *its own*
 * request: the page's own load is still in flight when the spec starts typing,
 * so an unqualified matcher happily resolves with that earlier response.
 */
export function waitForHistoryResponse(
	page: Page,
	endpoint: HistoryEndpoint,
	options?: { status?: number; filterExpression?: string },
): Promise<Response> {
	return page.waitForResponse((res) => {
		if (!isHistoryRequest(res.request(), endpoint)) return false;
		if (options?.status !== undefined && res.status() !== options.status)
			return false;
		if (
			options?.filterExpression !== undefined &&
			(requestUrl(res.request()).searchParams.get('filterExpression') ?? '') !==
				options.filterExpression
		)
			return false;
		return true;
	});
}

// ─── History interactions ──────────────────────────────────────────────────

/** Apply a filter expression through the real editor + Run button. */
export async function runFilterExpression(
	page: Page,
	expression: string,
): Promise<void> {
	await typeExpression(page, expression);
	await page.getByRole('button', { name: /run query/i }).click();
}

/**
 * Sort the timeline descending through the STATE header.
 *
 * The antd table is *uncontrolled* — it has `sorter: true` but no `sortOrder`,
 * so its internal cycle is none → ascend → descend regardless of the `order`
 * the hook already sends. Reaching `desc` therefore takes two clicks, and the
 * first one only resets the page (asc is nuqs's default, so it writes no param).
 */
export async function sortTimelineDescending(page: Page): Promise<void> {
	const header = page.getByRole('columnheader', { name: 'STATE' });
	const descRequest = page.waitForRequest(
		(req) =>
			isHistoryRequest(req, 'timeline') &&
			requestUrl(req).searchParams.get('order') === 'desc',
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
export async function timelineRowLabels(page: Page): Promise<string[]> {
	return timelineRows(page).getByTestId('timeline-row-labels').allInnerTexts();
}

/** Snapshot the first row's CREATED AT cell. See {@link timelineRowLabels}. */
export async function firstTimelineRowCreatedAt(page: Page): Promise<string> {
	return timelineRows(page)
		.first()
		.getByTestId('timeline-row-created-at')
		.innerText();
}
