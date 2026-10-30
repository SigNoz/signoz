import { expect, type Locator, type Page } from '@playwright/test';

import {
	ALERT_LIST_PAGE_SIZE,
	ALERT_OVERVIEW_PATH,
	ALERTS_LIST_PATH,
	DEFAULT_RELATIVE_TIME,
} from './constants';

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Open the alert overview (edit) page for `ruleId` and wait until it has fully
 * settled: the condition editor is visible and the query builder has finished
 * serializing the loaded query into the URL.
 */
export async function gotoAlertOverview(
	page: Page,
	ruleId: string,
): Promise<void> {
	await page.goto(`${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}`);
	// `.first()` because a rule may have several thresholds, and the editor renders
	// one input per threshold. Without it this is a strict-mode violation that only
	// appears once the *second* row has rendered — i.e. a timing-dependent failure
	// for multi-threshold rules.
	await expect(page.getByTestId('threshold-value-input').first()).toBeVisible();
	// The builder rewrites location.search shortly after load (adds compositeQuery).
	await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
	// Let post-load state updates flush so callers read the settled value.
	// eslint-disable-next-line playwright/no-wait-for-timeout -- no DOM signal for the async settle
	await page.waitForTimeout(500);
}

/**
 * Open the alert details shell (Overview tab) for `ruleId` and wait until it has
 * mounted. Unlike {@link gotoAlertOverview} this does **not** wait for the
 * condition editor or the serialised query — use it for scenarios about the
 * shell itself (header, tabs, actions menu) rather than the rule's contents.
 */
export async function gotoAlertDetails(
	page: Page,
	ruleId: string,
): Promise<void> {
	await page.goto(
		`${ALERT_OVERVIEW_PATH}?ruleId=${ruleId}&relativeTime=${DEFAULT_RELATIVE_TIME}`,
	);
	await expect(page.getByTestId('alert-details-root')).toBeVisible();
}

/** Rows currently rendered in the alert-rules table body. */
export function alertRuleRows(page: Page): Locator {
	return page.locator('tbody tr');
}

/** The list filter DSL, which the search box and the `query` param carry. */
export function nameContains(text: string): string {
	return `name CONTAINS '${text}'`;
}

/** The DSL search box's editable content (a CodeMirror editor). */
export function alertListSearch(page: Page): Locator {
	return page.getByTestId('alert-rules-list-search').locator('.cm-content');
}

/** Replace the DSL draft and run it, as Run query does. */
export async function runAlertListSearch(
	page: Page,
	query: string,
): Promise<void> {
	await alertListSearch(page).click();
	await page.keyboard.press('ControlOrMeta+A');
	await page.keyboard.insertText(query);
	await expect(alertListSearch(page)).toHaveText(query);
	await page.getByTestId('alert-rules-list-search-submit').click();
	await page.waitForURL(
		(url) => (url.searchParams.get('query') ?? '') === query.trim(),
	);
}

/**
 * Open the alert-rules list and wait until it has rows. `params` is merged into
 * the query string (`query`, `states`, `page`, `orderBy`, …); `limit` defaults to
 * {@link ALERT_LIST_PAGE_SIZE} so row counts are viewport-independent.
 *
 * Pass `expectRows: false` for scenarios whose filters are *meant* to match
 * nothing — the row wait would otherwise fail before the assertion runs.
 */
export async function gotoAlertList(
	page: Page,
	params: Record<string, string> = {},
	{ expectRows = true }: { expectRows?: boolean } = {},
): Promise<void> {
	const query = new URLSearchParams({
		limit: String(ALERT_LIST_PAGE_SIZE),
		...params,
	});
	await page.goto(`${ALERTS_LIST_PATH}?${query.toString()}`);
	await expect(alertListSearch(page)).toBeVisible();
	if (expectRows) {
		// Skeleton rows are empty and ignore clicks; wait for a loaded one.
		await expect(alertRuleRows(page).first()).toHaveText(/\S/);
	}
}
