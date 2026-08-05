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

export function drawer(page: Page): Locator {
	return page.getByTestId(DRAWER.wrapper);
}

export function drawerTitle(page: Page): Locator {
	return drawer(page).getByRole('heading').first();
}

export function tabBar(page: Page): Locator {
	return page.getByTestId(DRAWER.tabBar);
}

export function drawerTab(page: Page, view: DrawerView): Locator {
	return page.getByTestId(`drawer-tab-${view}`);
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

	await expect(async () => {
		await row.click();
		await expect(page.getByTestId(DRAWER.close)).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 30_000 });

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
 * Wait for the drawer to be open.
 *
 * The shell renders once `selectedItem` is set, but on a cold deep link that is
 * gated behind the entity-details query — an *ingestion*-bound wait under six
 * workers, not a render one. The default expect budget loses that race often
 * enough to be the suite's last remaining flake, so this is the one place the
 * longer budget lives.
 */
export async function expectDrawerVisible(page: Page): Promise<Locator> {
	const panel = drawer(page);
	await expect(panel).toBeVisible({ timeout: 30_000 });
	return panel;
}

export async function closeDrawer(page: Page): Promise<void> {
	await page.getByTestId(DRAWER.close).click();
	await expect(async () => {
		expect(new URL(page.url()).searchParams.get('selectedItem')).toBeNull();
	}).toPass();
}

/** The `selectedItem*` params `entity` writes for `sampleName`. */
export function selectedItemParams(entity: EntityDef): Record<string, string> {
	const params: Record<string, string> = {
		selectedItem: entity.seed.sampleItemKey,
	};
	if (entity.selectedItemExtraParams.includes('clusterName')) {
		params.selectedItemClusterName = entity.seed.sampleClusterName ?? '';
	}
	if (entity.selectedItemExtraParams.includes('namespaceName')) {
		params.selectedItemNamespaceName = entity.seed.sampleNamespaceName ?? '';
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
export async function renderedTabViews(page: Page): Promise<string[]> {
	return tabBar(page)
		.locator('button')
		.evaluateAll((buttons) =>
			buttons
				.map((button) => button.getAttribute('data-testid') ?? '')
				.map((id) => id.replace(/^drawer-tab-/, ''))
				.filter(Boolean),
		);
}

/**
 * `useInfraMonitoringView` defaults to `metrics` and the shared nuqs options set
 * `clearOnDefault`, so switching *to* Metrics deletes the param instead of writing
 * `view=metrics`. Asserting the literal makes every "…and back to Metrics" step
 * hang for the full expect timeout against a perfectly correct app.
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
	await picker.getByRole('textbox', { name: /Last / }).first().click();
	await page.getByRole('button', { name: option }).click();
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
} as const;

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
			// Mounting it *inside* the drawer keeps the focus the paste needs.
			const host =
				document.querySelector(`[data-testid="${drawerTestId}"]`) ?? document.body;
			host.append(scratch);
			scratch.focus();
		},
		{ id: SCRATCH_ID, drawerTestId: DRAWER.wrapper },
	);

	await page.keyboard.press('ControlOrMeta+v');
	const value = await page.evaluate((id) => {
		const scratch = document.getElementById(id) as HTMLTextAreaElement | null;
		const text = scratch?.value ?? '';
		scratch?.remove();
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
	return raw ? (JSON.parse(raw) as { offset: number; limit: number }) : null;
}
