/**
 * Driving the entity-details drawer: opening it (by click or deep link), the tab
 * bar, its own time picker, and the per-tab bodies.
 *
 * The drawer keeps a time range independent of the list's, under
 * `detailRelativeTime` / `detailStartTime` / `detailEndTime`, so every helper
 * that touches time is explicit about which of the two it means.
 */

import { expect, type Locator, type Page } from '@playwright/test';

import type { EntityDef } from './entities';
import { rowFor } from './list';

// ─── Selectors ───────────────────────────────────────────────────────────────

export const DRAWER = {
	wrapper: 'drawer-wrapper',
	close: 'close-drawer-button',
	copyId: 'copy-id-button',
	tabBar: 'drawer-tab-bar',
	timeSelection: 'drawer-time-selection',
	resetToListTime: 'reset-to-list-time-button',
} as const;

export const DRAWER_TAB = {
	metrics: 'metrics',
	logs: 'logs',
	traces: 'traces',
	events: 'events',
	podMetrics: 'pod_metrics',
} as const;

export type DrawerView = (typeof DRAWER_TAB)[keyof typeof DRAWER_TAB];

export const DRAWER_STATE = {
	emptyState: 'entity-empty-state',
	errorState: 'entity-error-state',
	eventsNotConfigured: 'events-not-configured',
} as const;

export const METRICS = {
	chartHeader: 'chart-header',
	infoIcon: 'chart-header-info-icon',
	table: 'metrics-table',
	/** The panel body. Carries `data-has-data`, so an empty panel is observable. */
	chart: 'entity-metrics-chart',
} as const;

/** `EntityMetrics` numbers its compass links by panel index. */
export function metricsExplorerLinkTestId(index: number): string {
	return `open-metrics-explorer-${index}`;
}

export const EXPLORER_LINK = {
	logs: 'open-logs-explorer',
	traces: 'open-traces-explorer',
} as const;

// ─── Locators ────────────────────────────────────────────────────────────────

/**
 * The **live** drawer panel.
 *
 * An exiting drawer keeps its node mounted for the slide-out animation, marked
 * `aria-hidden="true"`, so during a transition two `drawer-wrapper` dialogs are in
 * the DOM at once and a bare `getByTestId` is a strict-mode violation rather than a
 * missing element. That happens on Back out of the metrics explorer (B-MET-04),
 * where the drawer being restored mounts while the previous one is still leaving.
 * Excluding `aria-hidden` is also the semantically right filter: the hidden node is
 * out of the accessibility tree, so it is not the drawer a user is looking at.
 */
export function drawer(page: Page): Locator {
	return page.locator(
		`[data-testid="${DRAWER.wrapper}"]:not([aria-hidden="true"])`,
	);
}

export function drawerTitle(page: Page): Locator {
	return drawer(page).getByRole('heading').first();
}

export function tabBar(page: Page): Locator {
	return page.getByTestId(DRAWER.tabBar);
}

/**
 * The tab bar renders `ToggleGroupSimple` items, which carry no per-item testid
 * and drop their `value` before the DOM, so the label is the only handle on a
 * single tab.
 */
const DRAWER_TAB_LABEL: Record<DrawerView, string> = {
	[DRAWER_TAB.metrics]: 'Metrics',
	[DRAWER_TAB.logs]: 'Logs',
	[DRAWER_TAB.traces]: 'Traces',
	[DRAWER_TAB.events]: 'Events',
	[DRAWER_TAB.podMetrics]: 'Pod Metrics',
};

export function drawerTab(page: Page, view: DrawerView): Locator {
	return tabBar(page)
		.locator('button')
		.filter({ hasText: new RegExp(`^${DRAWER_TAB_LABEL[view]}$`) });
}

export function chartHeaders(page: Page): Locator {
	return page.getByTestId(METRICS.chartHeader);
}

export function countCard(page: Page, label: string): Locator {
	return page.getByTestId(`count-card-${slug(label)}`);
}

export function countCardNavLink(page: Page, label: string): Locator {
	return page.getByTestId(`navigate-${slug(label)}`);
}

/** `EntityCountsSection` derives its testids from the label this way. */
export function slug(label: string): string {
	return label.toLowerCase().replace(/\s+/g, '-');
}

// ─── Opening and closing ─────────────────────────────────────────────────────

/**
 * Click a row to open its drawer.
 *
 * The list re-renders as the counts and list requests settle, so a single click
 * can land on a detaching row — the click is retried until the drawer is up.
 */
export async function openRowDrawer(
	page: Page,
	rowKey: string,
): Promise<Locator> {
	const row = rowFor(page, rowKey);
	await expect(row).toBeVisible();

	// Two things the obvious retry gets wrong. The click needs its own timeout:
	// `toPass` awaits the callback to completion before checking its deadline, so
	// an unbounded `click()` cannot be interrupted — and if the drawer opened just
	// after the 3 s check, the retry's click is now behind the drawer's modal mask
	// and blocks on actionability forever, killing the test with no useful output.
	// And the retry has to be a no-op once the drawer is up, for the same reason.
	await expect(async () => {
		if (!(await drawer(page).isVisible())) {
			// `TanStackHeaderRow` is `position: sticky`, so the row Playwright scrolls
			// "just into view" lands *under* the header and the click is swallowed by a
			// header cell. Centring it first keeps it clear of both sticky edges.
			await row.evaluate((element) => element.scrollIntoView({ block: 'center' }));
			await row.click({ timeout: 5_000 });
		}
		await expect(page.getByTestId(DRAWER.close)).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 20_000 });

	const panel = drawer(page);
	await expect(panel).toBeVisible();
	return panel;
}

/** Ctrl/Cmd-click a row, returning the page the app opened. */
export async function openRowInNewTab(
	page: Page,
	rowKey: string,
): Promise<Page> {
	const [opened] = await Promise.all([
		page.context().waitForEvent('page'),
		rowFor(page, rowKey).click({ modifiers: ['ControlOrMeta'] }),
	]);
	await opened.waitForLoadState();
	return opened;
}

/**
 * Wait for the drawer **shell** to be open.
 *
 * `K8sBaseDetails` renders `<DrawerWrapper open={!!selectedItem}>` with a
 * `<LoadingContainer/>` inside, so the shell appears the instant `selectedItem`
 * is in the URL — it is *not* gated behind the entity-details query, whatever
 * the plan says. The long budget stays because a deep link still has to load the
 * app, but be clear about what this proves: only that the drawer opened.
 *
 * **This is not evidence that any tab body rendered.** The tab bar, metadata
 * row, time picker and every tab body mount later, when the entity query
 * resolves. An absence assertion fired right after this one passes on its first
 * poll and can never fail — use {@link expectDrawerBodyReady} first.
 */
export async function expectDrawerVisible(page: Page): Promise<Locator> {
	const panel = drawer(page);
	await expect(panel).toBeVisible({ timeout: 30_000 });
	return panel;
}

/**
 * Wait for the drawer's **body** — the part gated behind the entity-details
 * query — to have rendered.
 *
 * Required before any `toHaveCount(0)` / `toBeHidden` assertion about drawer
 * content, and before reading the tab bar or the metadata row. Without it those
 * assertions resolve against a still-loading drawer and pass unconditionally:
 * "hosts has no Events tab" and "volumes has no tab bar" were both green because
 * the tab bar had not mounted yet, not because it was absent.
 *
 * `drawer-time-selection` is the signal because `EntityDateTimeSelector` is
 * rendered by all four tab bodies (Metrics, Logs, Traces, Events) and by nothing
 * in the shell — including on volumes, which has no tab bar but still renders the
 * Metrics body.
 */
export async function expectDrawerBodyReady(page: Page): Promise<Locator> {
	const panel = await expectDrawerVisible(page);
	await expect(drawerTimePicker(page)).toBeVisible({ timeout: 30_000 });
	return panel;
}

export async function closeDrawer(page: Page): Promise<void> {
	await page.getByTestId(DRAWER.close).click();
	await expect(async () => {
		expect(new URL(page.url()).searchParams.get('selectedItem')).toBeNull();
	}).toPass();
}

/**
 * The `selectedItem*` params `entity` writes for its sample row.
 *
 * Throws rather than defaulting a missing registry value to `''`. A deep link
 * with an empty extra opens a drawer titled `-` with empty panels — which is
 * indistinguishable from a slow one, so the scenario fails somewhere else
 * entirely. An incomplete registry entry is a suite bug and should say so here.
 */
export function selectedItemParams(entity: EntityDef): Record<string, string> {
	const params: Record<string, string> = {
		selectedItem: entity.seed.sampleItemKey,
	};
	const require = (value: string | undefined, field: string): string => {
		if (!value) {
			throw new Error(
				`${entity.key}: seed.${field} is required because selectedItemExtraParams asks for it`,
			);
		}
		return value;
	};
	if (entity.selectedItemExtraParams.includes('clusterName')) {
		params.selectedItemClusterName = require(entity.seed
			.sampleClusterName, 'sampleClusterName');
	}
	if (entity.selectedItemExtraParams.includes('namespaceName')) {
		params.selectedItemNamespaceName = require(entity.seed
			.sampleNamespaceName, 'sampleNamespaceName');
	}
	return params;
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

/** Tab labels the bar renders, in order. */
export async function renderedTabs(page: Page): Promise<string[]> {
	const labels = await tabBar(page).locator('button').allInnerTexts();
	return labels.map((label) => label.trim()).filter(Boolean);
}

/** Tab `value`s the bar renders, in order — the URL-visible identity. */
export async function renderedTabViews(page: Page): Promise<DrawerView[]> {
	const byLabel = new Map(
		Object.entries(DRAWER_TAB_LABEL).map(([view, label]) => [
			label,
			view as DrawerView,
		]),
	);
	const labels = await renderedTabs(page);
	return labels
		.map((label) => byLabel.get(label))
		.filter((view): view is DrawerView => Boolean(view));
}

/**
 * `useInfraMonitoringView` is `parseAsString.withDefault(VIEWS.METRICS)`, and nuqs
 * clears a param whose value equals its default (`clearOnDefault` is on unless a
 * parser opts out — the shared options only set `history: 'push'`). So switching
 * *to* Metrics deletes the param instead of writing `view=metrics`, while every
 * other tab writes its value normally. Asserting the literal makes every "…and
 * back to Metrics" step hang for the full expect timeout against a correct app.
 */
export const DEFAULT_DRAWER_VIEW: DrawerView = DRAWER_TAB.metrics;

/** The `view` value the URL should carry for `view` — `null` when it is the default. */
export function expectedViewParam(view: DrawerView): string | null {
	return view === DEFAULT_DRAWER_VIEW ? null : view;
}

export async function switchDrawerTab(
	page: Page,
	view: DrawerView,
): Promise<void> {
	await drawerTab(page, view).click();
	await expect(async () => {
		expect(viewFromUrl(page)).toBe(expectedViewParam(view));
	}).toPass();
	// The tab bar is the authority on what actually rendered; the URL alone cannot
	// distinguish "switched to Metrics" from "never wrote a view".
	await expect(drawerTab(page, view)).toHaveAttribute('data-state', 'on');
}

export function viewFromUrl(page: Page): string | null {
	return new URL(page.url()).searchParams.get('view');
}

// ─── The drawer's own time range ─────────────────────────────────────────────

export function drawerTimePicker(page: Page): Locator {
	return page.getByTestId(DRAWER.timeSelection);
}

/**
 * Pick a relative range in the drawer's picker — scoped to the drawer so the
 * list's picker (still showing its own range) cannot satisfy the locator.
 *
 * `option` is the option's accessible name, which for shorthand ranges carries a
 * badge: `Last 6 hours 6h`. Month options have no badge, so plain `Last 1 month`.
 * The value that lands in `detailRelativeTime` is the shorthand — `6h`, `1month`.
 */
export async function setDrawerTime(page: Page, option: string): Promise<void> {
	const picker = drawerTimePicker(page);
	// The picker belongs to the *tab body*, which mounts after the drawer shell and
	// after the entity-details query settles. Under six workers that lands well
	// outside the default expect timeout, so wait for it explicitly rather than
	// failing with "element(s) not found" on a drawer that is merely still loading.
	await expect(picker).toBeVisible({ timeout: 30_000 });
	const before = new URL(page.url()).searchParams.get('detailRelativeTime');
	await picker.getByRole('textbox', { name: /Last / }).first().click();
	// The option list renders in a portal attached to `body`, so it is genuinely
	// out of the picker's subtree and cannot be scoped to it. Only the *trigger*
	// above is drawer-scoped; the list's names are unique enough that this is safe.
	await page.getByRole('button', { name: option }).click();
	// Post-condition, so a caller cannot mistake "the option was clicked" for "the
	// drawer's range changed". Every current caller asserts this itself; folding it
	// in means the next one inherits it. `resetDrawerTimeToList` already does this.
	await expect(async () => {
		expect(new URL(page.url()).searchParams.get('detailRelativeTime')).not.toBe(
			before,
		);
	}).toPass();
}

export function resetToListTimeButton(page: Page): Locator {
	return page.getByTestId(DRAWER.resetToListTime);
}

export async function resetDrawerTimeToList(page: Page): Promise<void> {
	await resetToListTimeButton(page).click();
	await expect(async () => {
		expect(new URL(page.url()).searchParams.get('detailRelativeTime')).toBeNull();
	}).toPass();
}

export function drawerTimeParams(page: Page): {
	relativeTime: string | null;
	startTime: string | null;
	endTime: string | null;
} {
	const params = new URL(page.url()).searchParams;
	return {
		relativeTime: params.get('detailRelativeTime'),
		startTime: params.get('detailStartTime'),
		endTime: params.get('detailEndTime'),
	};
}

// ─── Per-tab bodies ──────────────────────────────────────────────────────────

export function emptyState(page: Page): Locator {
	return page.getByTestId(DRAWER_STATE.emptyState);
}

/**
 * `EntityEmptyState` swaps its copy on `hasFilters`, and the copy is the only
 * thing that distinguishes the two branches in the DOM.
 */
export async function expectEmptyState(
	page: Page,
	hasFilters: boolean,
): Promise<void> {
	await expect(emptyState(page)).toContainText(
		hasFilters ? 'This query had no results.' : 'No data yet.',
	);
}

export function errorState(page: Page): Locator {
	return page.getByTestId(DRAWER_STATE.errorState);
}

export function eventsNotConfigured(page: Page): Locator {
	return page.getByTestId(DRAWER_STATE.eventsNotConfigured);
}

/** The per-tab user-expression params, cleared on every tab change. */
export const TAB_EXPRESSION_PARAMS = [
	'logFilters',
	'tracesFilters',
	'eventsFilters',
] as const;

/**
 * Where each tab keeps the **user's** half of its expression — the entity scope
 * lives separately and cannot be edited away. From
 * `K8S_ENTITY_LOGS_EXPRESSION_KEY` / `K8S_ENTITY_TRACES_EXPRESSION_KEY`.
 */
export const TAB_USER_EXPRESSION_PARAM = {
	logs: 'k8sEntityLogsExpression',
	traces: 'k8sEntityTracesExpression',
	events: 'k8sEntityEventsExpression',
} as const;

/**
 * Not to be confused with {@link TAB_USER_EXPRESSION_PARAM}. `eventsFilters` and
 * its two siblings are *write-only-null*: `K8sBaseDetailsContent` clears them on
 * every tab change and nothing in the product ever sets them to a value. They are
 * worth asserting as "cleared on tab switch" (B-DRW-09) and worth nothing at all
 * as a stand-in for a user expression.
 */
export type TabWithUserExpression = keyof typeof TAB_USER_EXPRESSION_PARAM;

/**
 * Read back what a copy button put on the clipboard, by pasting.
 *
 * `useCopyToClipboard` (react-use) writes through `document.execCommand('copy')`,
 * not the async Clipboard API, so `navigator.clipboard.readText()` throws
 * NotAllowedError however the permission is granted — the value never went
 * through that API. Pasting into a scratch textarea uses the same system
 * clipboard the copy actually wrote to.
 */
export async function readClipboardViaPaste(page: Page): Promise<string> {
	const SCRATCH_ID = '__e2e_clipboard_scratch';
	await page.evaluate(
		({ id, drawerTestId }) => {
			const existing = document.getElementById(id);
			existing?.remove();
			const scratch = document.createElement('textarea');
			scratch.id = id;
			// Off-screen but focusable — `display: none` cannot receive a paste.
			scratch.style.position = 'fixed';
			scratch.style.opacity = '0';
			scratch.style.left = '0';
			scratch.style.top = '0';
			// antd's Drawer traps focus: a textarea appended to `body` is yanked back
			// into the drawer before the paste lands, and the read comes back empty.
			// Mounting it *inside* the drawer keeps the focus the paste needs — so
			// falling back to `body` would silently reproduce the exact bug this
			// placement exists to avoid. Fail instead.
			const host = document.querySelector(`[data-testid="${drawerTestId}"]`);
			if (!host) {
				throw new Error(
					'readClipboardViaPaste: no drawer to mount the scratch textarea in — ' +
						'a textarea on `body` loses focus to antd’s focus trap and reads empty',
				);
			}
			host.append(scratch);
			scratch.focus();
		},
		{ id: SCRATCH_ID, drawerTestId: DRAWER.wrapper },
	);

	await page.keyboard.press('ControlOrMeta+v');
	// The paste is asynchronous: reading straight after the keypress races it and
	// returns '' — which reads as "the copy button copied nothing".
	const scratch = page.locator(`#${SCRATCH_ID}`);
	await expect(scratch).not.toHaveValue('');
	const value = await page.evaluate((id) => {
		const element = document.getElementById(id) as HTMLTextAreaElement | null;
		const text = element?.value ?? '';
		element?.remove();
		return text;
	}, SCRATCH_ID);
	return value;
}

/** The non-editable scope chip `QuerySearch` renders for an initial expression. */
export const SCOPE_CHIP = '.query-search-initial-scope-label';

/**
 * Each drawer tab renders its **own** `RunQueryBtn`, so the list's Run and up to
 * one tab's Run co-exist in the DOM. Both are addressed by testid rather than
 * `.run-query-btn`, which resolves to two elements whenever the drawer is open.
 */
const ENTITY_RUN_QUERY_TEST_ID = {
	logs: 'entity-logs-run-query-btn',
	traces: 'entity-traces-run-query-btn',
	events: 'entity-events-run-query-btn',
} as const;

export type EntityQueryTab = keyof typeof ENTITY_RUN_QUERY_TEST_ID;

export function entityRunQueryButton(page: Page, tab: EntityQueryTab): Locator {
	return page.getByTestId(ENTITY_RUN_QUERY_TEST_ID[tab]);
}

/** Press the Run button belonging to a drawer tab, not the list's. */
export async function runEntityQuery(
	page: Page,
	tab: EntityQueryTab,
): Promise<void> {
	await entityRunQueryButton(page, tab).click();
}

/**
 * The offset/limit param name is **not** shared between tabs: traces owns
 * `pagination`, events owns `eventsPagination`. Deep-linking the wrong one leaves
 * the tab on its default page while the URL still carries the value, which reads
 * as "the app reset my pagination".
 */
export const PAGINATION_PARAM = {
	traces: 'pagination',
	events: 'eventsPagination',
} as const;

export type PaginatedTab = keyof typeof PAGINATION_PARAM;

export function paginationFromUrl(
	page: Page,
	tab: PaginatedTab,
): { offset: number; limit: number } | null {
	const raw = new URL(page.url()).searchParams.get(PAGINATION_PARAM[tab]);
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as { offset: number; limit: number };
	} catch {
		// Named rather than retried: inside a `toPass` a bare SyntaxError re-throws
		// every 100 ms until the deadline and reports as a timeout.
		throw new Error(
			`${PAGINATION_PARAM[tab]} is not decodable JSON — got \`${raw.slice(0, 200)}\``,
		);
	}
}
