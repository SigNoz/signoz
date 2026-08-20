import { expect, type Locator, type Page } from '@playwright/test';

import {
	ALERTS_NEW_PATH,
	AlertType,
	type AlertTypeValue,
	RuleType,
	STOCK_ALERT_TYPE_CARDS,
} from './constants';
import { v1SaveButton } from './v1';

// ─── Navigation ────────────────────────────────────────────────────────────

/**
 * Open the bare type-selection page. `isTypeSelectionMode` is
 * `!alertType && !ruleType && !compositeQuery`
 * (`container/CreateAlertRule/index.tsx:39-41`), so *any* of those three params
 * skips this page — including a stale `compositeQuery` left in the URL.
 */
export async function gotoAlertTypeSelection(page: Page): Promise<void> {
	await page.goto(ALERTS_NEW_PATH);
	await expect(alertTypeCard(page, AlertType.METRICS)).toBeVisible();
}

export function alertTypeCard(page: Page, type: AlertTypeValue): Locator {
	return page.getByTestId(`alert-type-card-${type}`);
}

export function alertTypeCards(page: Page): Locator {
	return page.locator('[data-testid^="alert-type-card-"]');
}

/**
 * Whether the anomaly card is on the page, i.e. whether `ANOMALY_DETECTION` is
 * active for this stack. It **is** active on the pytest-bootstrapped integration
 * stack, so every card-count assertion has to branch on it rather than hard-code
 * 4.
 */
export async function hasAnomalyAlertTypeCard(page: Page): Promise<boolean> {
	return (await alertTypeCard(page, AlertType.ANOMALY).count()) > 0;
}

/**
 * Assert the type-selection page shows exactly the expected set of cards: the
 * four stock ones, plus anomaly *first* when the flag is on (`getOptionList`
 * `unshift`s it, `SelectAlertType/config.ts:33-40`).
 *
 * Written as an exact set rather than "at least four" so that adding a fifth
 * signal still fails this assertion — the flag branch is the only slack.
 */
export async function expectAlertTypeCardSet(page: Page): Promise<void> {
	const anomaly = await hasAnomalyAlertTypeCard(page);
	const expected = anomaly
		? [AlertType.ANOMALY, ...STOCK_ALERT_TYPE_CARDS]
		: STOCK_ALERT_TYPE_CARDS;

	const cards = alertTypeCards(page);
	await expect(cards).toHaveCount(expected.length);

	// Read the testids positionally so order is asserted too — anomaly being
	// unshifted rather than appended is the behaviour worth pinning.
	const rendered: (string | null)[] = [];
	for (let i = 0; i < expected.length; i += 1) {
		// eslint-disable-next-line no-await-in-loop
		rendered.push(await cards.nth(i).getAttribute('data-testid'));
	}
	expect(rendered).toEqual(expected.map((type) => `alert-type-card-${type}`));
}

export interface CreateAlertUrlOptions {
	alertType?: AlertTypeValue;
	ruleType?: string;
	/** Sets `showClassicCreateAlertsPage=true` ⇒ the v1 classic form. */
	classic?: boolean;
	/** Merged in last, so it can override anything above. */
	params?: Record<string, string>;
}

export function createAlertUrl({
	alertType = AlertType.LOGS,
	ruleType = RuleType.THRESHOLD,
	classic = false,
	params = {},
}: CreateAlertUrlOptions = {}): string {
	const search = new URLSearchParams({ alertType, ruleType });
	if (classic) {
		search.set('showClassicCreateAlertsPage', 'true');
	}
	for (const [key, value] of Object.entries(params)) {
		search.set(key, value);
	}
	return `${ALERTS_NEW_PATH}?${search.toString()}`;
}

/**
 * Open the **v2** builder and wait until it has settled. The wait is two-part on
 * purpose: the header proves the builder mounted, and the `compositeQuery` in the
 * URL proves `useShareBuilderUrl` has finished serialising the default query —
 * without the second half, an assertion on the URL races the builder's own
 * rewrite (the same trap `gotoAlertOverview` documents).
 */
export async function gotoCreateAlertV2(
	page: Page,
	options: Omit<CreateAlertUrlOptions, 'classic'> = {},
): Promise<void> {
	await page.goto(createAlertUrl({ ...options, classic: false }));
	await expect(page.getByTestId('alert-name-input')).toBeVisible();
	await page.waitForURL(/compositeQuery=/, { timeout: 15_000 });
}

/** Open the **v1** classic create form and wait for its primary action. */
export async function gotoCreateAlertV1(
	page: Page,
	options: Omit<CreateAlertUrlOptions, 'classic'> = {},
): Promise<void> {
	await page.goto(createAlertUrl({ ...options, classic: true }));
	await expect(v1SaveButton(page)).toBeVisible();
}
