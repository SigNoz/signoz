/**
 * Driving the infra-monitoring list: navigation, the table, the toolbar, the
 * options panel and the quick-filter rail.
 *
 * Two details are load-bearing and were paid for in flake:
 *
 * - **Row clicks need `expect(...).toPass()`.** The list re-renders as the counts
 *   and list requests settle, so a single click can land on a detaching row.
 * - **Locators must be table-scoped.** An entity's name also appears as a
 *   quick-filter checkbox in the left rail; clicking that only applies a filter.
 */

import { expect, type Locator, type Page } from '@playwright/test';

import type { EntityDef } from './entities';

// ─── Selectors ───────────────────────────────────────────────────────────────

const TABLE_TOOLBAR = {
	groupBySelect: 'k8s-table-group-by-select',
	optionsButton: 'k8s-table-options-button',
} as const;

const PAGINATION = {
	totalCount: 'pagination-total-count',
	pageSize: 'pagination-page-size',
	warningPopover: 'k8s-list-warning-popover',
} as const;

export const EMPTY_STATE = {
	empty: 'k8s-empty-state',
	retention: 'k8s-empty-state-retention',
	error: 'k8s-error-state',
} as const;

export const NO_RESULTS_TEXT =
	'This query had no results. Edit your query and try again!';

const QUERY_EDITOR = '.query-where-clause-editor .cm-content';
const LIST_RUN_QUERY_TEST_ID = 'list-run-query-btn';

/**
 * `TanStackHeaderRow` builds these labels from the column **id**, not the
 * visible header text — `column.header` is a render function for every infra
 * column, so its string branch never applies. Centralised here so a spec never
 * has to know that.
 */
export function dragHandleLabel(columnId: string): string {
	return `Drag ${columnId} column`;
}

export function columnActionsLabel(columnId: string): string {
	return `Column actions for ${columnId.replace(/^\w/, (c) => c.toUpperCase())}`;
}

// ─── localStorage ────────────────────────────────────────────────────────────

const COLUMN_STORAGE_PREFIX = '@signoz/table-columns/';
export const TABLE_PREFERENCES_KEY =
	'@signoz/infra-monitoring-table-preferences';

export function columnStorageKey(entity: EntityDef): string {
	return `${COLUMN_STORAGE_PREFIX}${entity.columnStorageKey}`;
}

export function expandedColumnStorageKey(entity: EntityDef): string {
	return `${COLUMN_STORAGE_PREFIX}${entity.expandedColumnStorageKey}`;
}

export function pageSizeStorageKey(entity: EntityDef): string {
	return `${COLUMN_STORAGE_PREFIX}${entity.pageSizeStorageKey}`;
}

export interface ColumnState {
	hiddenColumnIds?: string[];
	columnOrder?: string[];
	columnSizing?: Record<string, number>;
}

/** Marker that makes {@link resetTableState} clear state exactly once. */
const RESET_MARKER = '__e2e_infra_table_reset';

/**
 * Clear the persisted table state for `entity` **and** the global table
 * preferences, once, before the first navigation.
 *
 * Both keys matter for isolation: the per-entity ones carry column visibility,
 * order, sizing and the preferred page size, while
 * `@signoz/infra-monitoring-table-preferences` holds font size and line clamp for
 * *every* entity.
 *
 * The "once" is load-bearing. `addInitScript` re-runs before app code on **every**
 * navigation, so an unguarded version also wipes the state on `page.reload()` —
 * which silently breaks exactly the scenarios that assert persistence survives a
 * reload (B-LIST-12/13, B-OPT-02/03). The marker makes the clear a one-shot.
 */
export async function resetTableState(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	await page.addInitScript(
		({ keys, marker }) => {
			if (sessionStorage.getItem(marker)) {
				return;
			}
			sessionStorage.setItem(marker, '1');
			for (const key of keys) {
				localStorage.removeItem(key);
			}
		},
		{
			marker: RESET_MARKER,
			keys: [
				columnStorageKey(entity),
				expandedColumnStorageKey(entity),
				pageSizeStorageKey(entity),
				TABLE_PREFERENCES_KEY,
			],
		},
	);
}

export interface TablePreferences {
	fontSize?: string;
	lineClamp?: number;
}

/**
 * Read the global font-size / line-clamp preferences.
 *
 * `useInfraMonitoringTablePreferencesStore` persists through zustand's `persist`
 * middleware, so the payload is the `{ state, version }` envelope rather than the
 * bare store — reading the keys off the top level silently yields `undefined` for
 * both and makes B-OPT-07/08 fail against a perfectly healthy app.
 *
 * `useColumnStore` writes its own JSON directly, which is why
 * {@link readColumnState} needs no unwrapping.
 */
export async function readTablePreferences(
	page: Page,
): Promise<TablePreferences> {
	const raw = await page.evaluate(
		(key) => localStorage.getItem(key),
		TABLE_PREFERENCES_KEY,
	);
	if (!raw) {
		return {};
	}
	const parsed = JSON.parse(raw) as {
		state?: TablePreferences;
	} & TablePreferences;
	return parsed.state ?? parsed;
}

export async function readColumnState(
	page: Page,
	storageKey: string,
): Promise<ColumnState> {
	const raw = await page.evaluate(
		(key) => localStorage.getItem(key),
		storageKey,
	);
	return raw ? (JSON.parse(raw) as ColumnState) : {};
}

/**
 * Persist a column state the way the app does — **complete**.
 *
 * `useColumnStore` always writes all three keys, so a spec that seeds only one of
 * them is testing a shape the product never produces. Partial values are worth a
 * scenario of their own (see B-OPT-11) rather than being the accidental setup of
 * every other one.
 */
export async function writeColumnState(
	page: Page,
	storageKey: string,
	state: ColumnState,
): Promise<void> {
	const complete: Required<ColumnState> = {
		hiddenColumnIds: state.hiddenColumnIds ?? [],
		columnOrder: state.columnOrder ?? [],
		columnSizing: state.columnSizing ?? {},
	};
	await page.evaluate(
		({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
		{ key: storageKey, value: complete },
	);
}

/** Persist a deliberately malformed column state, byte for byte. */
export async function writeRawColumnState(
	page: Page,
	storageKey: string,
	raw: string,
): Promise<void> {
	await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
		key: storageKey,
		value: raw,
	});
}

// ─── The filter expression — the single reader/writer pair ────────────────────

/**
 * `compositeQuery` is on the way out: the query-URL serializer work replaces it
 * with flat leaf params. Every expression read and write in the suite goes
 * through {@link applyExpression} / {@link readExpression} so that migration is a
 * change here rather than in forty specs.
 */
const EXPRESSION_PARAM = 'compositeQuery';

interface CompositeQuery {
	builder?: {
		queryData?: { filter?: { expression?: string } }[];
	};
}

/** The filter expression currently encoded in the URL, or `''` when unset. */
export function readExpression(page: Page): string {
	const raw = new URL(page.url()).searchParams.get(EXPRESSION_PARAM);
	if (!raw) {
		return '';
	}
	// The app writes `encodeURIComponent(JSON.stringify(query))` into a
	// URLSearchParams value, so one decode remains after `searchParams.get`.
	let json = raw;
	try {
		json = decodeURIComponent(raw);
	} catch {
		// Already-decoded values (a hand-written deep link) reach here unchanged.
	}
	try {
		const parsed = JSON.parse(json) as CompositeQuery;
		return parsed.builder?.queryData?.[0]?.filter?.expression ?? '';
	} catch {
		return '';
	}
}

/** Type an expression into the search box and press Run. */
export async function applyExpression(
	page: Page,
	expression: string,
): Promise<void> {
	const editor = page.locator(QUERY_EDITOR).first();
	// The CodeMirror editor mounts after the list's first response, which under six
	// workers can outlast the default expect timeout.
	await expect(editor).toBeVisible({ timeout: SEEDED_ROW_TIMEOUT_MS });
	await editor.click();
	await page.keyboard.press('ControlOrMeta+a');
	await page.keyboard.press('Delete');
	if (expression) {
		await page.keyboard.type(expression);
	}
	// Typing opens the suggestion popover, which covers the Run button.
	await page.keyboard.press('Escape');
	await runQuery(page);
	await expect(async () => {
		expect(readExpression(page)).toBe(expression);
	}).toPass({ timeout: 15_000 });
}

/** Press Run without touching the search box (the `stagedExpressionRef` path). */
export async function runQuery(page: Page): Promise<void> {
	await runQueryButton(page).click();
}

/**
 * The **list's** Run button.
 *
 * `.run-query-btn` is shared with the drawer's Logs / Traces / Events tabs, so
 * with a drawer open the bare class resolves to two elements and every click
 * fails on strict mode. `RunQueryBtn` now takes a `testId`, and each infra call
 * site passes its own — see {@link entityRunQueryButton} for the drawer's.
 */
export function runQueryButton(page: Page): Locator {
	return page.getByTestId(LIST_RUN_QUERY_TEST_ID);
}

export function cancelQueryButton(page: Page): Locator {
	return page.getByTestId(`${LIST_RUN_QUERY_TEST_ID}-cancel`);
}

export function querySearchEditor(page: Page): Locator {
	return page.locator(QUERY_EDITOR).first();
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Open `entity`'s list. The kubernetes route needs `category=<key>` for every
 * entity except pods, whose default the app deliberately drops from the URL.
 */
export function listUrl(
	entity: EntityDef,
	params: Record<string, string> = {},
): string {
	const search = new URLSearchParams(params);
	if (entity.categoryTestId && entity.key !== 'pods') {
		search.set('category', entity.key);
	}
	const query = search.toString();
	return query ? `${entity.route}?${query}` : entity.route;
}

export async function gotoList(
	page: Page,
	entity: EntityDef,
	params: Record<string, string> = {},
): Promise<void> {
	await page.goto(listUrl(entity, params));
	// Same ingestion-bound wait as the rows: the editor mounts with the list's first
	// response, not with the shell.
	await expect(page.locator(QUERY_EDITOR).first()).toBeVisible({
		timeout: SEEDED_ROW_TIMEOUT_MS,
	});
}

/**
 * Encode a filter expression as the `compositeQuery` param, for deep links.
 *
 * Paired with {@link readExpression} — the two are the only places in the suite
 * that know the expression's URL encoding, so the pending flat-leaf-param
 * migration lands here.
 */
export function expressionParam(expression: string): string {
	return encodeURIComponent(
		JSON.stringify({
			queryType: 'builder',
			builder: {
				queryData: [{ filter: { expression }, filters: { items: [], op: 'AND' } }],
			},
		}),
	);
}

/**
 * A list URL scoped to `names` through the entity's name attribute.
 *
 * Seeding is additive and the stack is shared across six workers, so an
 * unscoped list can push the row under test onto page 3 the moment a sibling
 * spec seeds its own dataset for the same entity. Scoping by a seed-owned label
 * is what §6 of the plan means by "never assert 'the table has exactly N rows'".
 */
export function scopedListUrl(
	entity: EntityDef,
	names: string[],
	params: Record<string, string> = {},
): string {
	const values = names.map((name) => `'${name}'`).join(', ');
	return listUrl(entity, {
		...params,
		compositeQuery: expressionParam(
			`${ENTITY_NAME_ATTR[entity.key]} IN (${values})`,
		),
	});
}

/** Attribute each entity's list filters its name on. */
export const ENTITY_NAME_ATTR: Record<string, string> = {
	hosts: 'host.name',
	pods: 'k8s.pod.name',
	nodes: 'k8s.node.name',
	namespaces: 'k8s.namespace.name',
	clusters: 'k8s.cluster.name',
	deployments: 'k8s.deployment.name',
	statefulsets: 'k8s.statefulset.name',
	daemonsets: 'k8s.daemonset.name',
	jobs: 'k8s.job.name',
	volumes: 'k8s.persistentvolumeclaim.name',
};

/** Open `entity`'s list showing only `names`. */
export async function gotoScopedList(
	page: Page,
	entity: EntityDef,
	names: string[],
	params: Record<string, string> = {},
): Promise<void> {
	await page.goto(scopedListUrl(entity, names, params));
	await expect(page.locator(QUERY_EDITOR).first()).toBeVisible();
}

/** Click a left-rail category button and wait for the switch to land. */
export async function switchCategory(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	if (!entity.categoryTestId) {
		throw new Error(`${entity.key} has no category rail button`);
	}
	await page.getByTestId(entity.categoryTestId).click();
	// pods is the default and its param is dropped rather than written.
	if (entity.key === 'pods') {
		await expect(async () => {
			expect(new URL(page.url()).searchParams.get('category')).toBeNull();
		}).toPass();
	} else {
		await expect(page).toHaveURL(new RegExp(`category=${entity.key}\\b`));
	}
}

// ─── The table ───────────────────────────────────────────────────────────────

/** The list table — scoped so nothing in the left rail can match. */
export function table(page: Page): Locator {
	return page.locator('table').first();
}

export function headerCells(page: Page): Locator {
	return table(page).locator('thead th');
}

/** Visible header titles, in render order. */
export async function visibleColumnHeaders(page: Page): Promise<string[]> {
	const titles = await headerCells(page)
		.locator('.tanstack-header-title')
		.allInnerTexts();
	return titles.map((title) => title.trim()).filter(Boolean);
}

export function dataRows(page: Page): Locator {
	return page.locator('[data-testid^="row-"]');
}

/**
 * The table row for `name`. Anchored on `data-testid` so it cannot match the
 * quick-filter checkbox of the same name in the left rail.
 */
export function rowFor(page: Page, rowKey: string): Locator {
	return page.getByTestId(`row-${rowKey}`);
}

/**
 * Wait until the list has rendered at least one row of **real data**.
 *
 * While loading, `TanStackTable` renders `skeletonRowCount` placeholder rows that
 * carry the same `row-*` testids as real ones — their cells are antd
 * `Skeleton.Input`s, and the accessors behind `getRowKey` return `''`, so a row
 * key reads as `row-unknown`. Waiting only for a row to exist therefore samples
 * the skeleton; waiting for the skeletons to *go* is what makes row-order and
 * row-key assertions deterministic.
 */
/**
 * How long to wait for seeded rows.
 *
 * Longer than the default expect timeout on purpose: a row appearing is not a
 * render race but an *ingestion* one — the seeder's insert has to be queryable in
 * ClickHouse, and with six workers seeding at once that regularly takes longer
 * than 15 s. Failing at the default budget produces "row not visible" on data
 * that arrives a second later, which reads as product flake and is not.
 */
const SEEDED_ROW_TIMEOUT_MS = 30_000;

export async function waitForRows(page: Page): Promise<void> {
	await expect(dataRows(page).first()).toBeVisible({
		timeout: SEEDED_ROW_TIMEOUT_MS,
	});
	// Skeleton rows carry the same testids as real ones, so a spec that reads row
	// keys while they are up gets `row-unknown` back.
	await expect(table(page).locator('.ant-skeleton')).toHaveCount(0);
}

/** Wait until `name`'s row is present — i.e. the seeded data has landed. */
export async function waitForRow(page: Page, rowKey: string): Promise<void> {
	await expect(rowFor(page, rowKey)).toBeVisible({
		timeout: SEEDED_ROW_TIMEOUT_MS,
	});
}

/**
 * `title` attribute `TanStackHeaderRow` puts on both the sort button and the
 * plain header span. Like the drag/actions labels it comes from the column
 * **id**, capitalised — not from the visible header text.
 */
export function headerTitleAttr(columnId: string): string {
	return columnId.replace(/^\w/, (c) => c.toUpperCase());
}

/** The header cell for a column, located by its `title` attribute. */
export function headerCell(page: Page, columnId: string): Locator {
	return headerCells(page)
		.filter({ has: page.locator(`[title="${headerTitleAttr(columnId)}"]`) })
		.first();
}

/** The sort button of a sortable column. Absent on non-sortable columns. */
export function sortButton(page: Page, columnId: string): Locator {
	return headerCell(page, columnId).locator('button.tanstack-header-title');
}

/** The `…` column-actions trigger, present only on removable columns. */
export function columnActionsTrigger(page: Page, columnId: string): Locator {
	return page.getByRole('button', { name: columnActionsLabel(columnId) });
}

/**
 * Click a sortable column header once, advancing its asc → desc → unsorted cycle.
 *
 * Resolves once the URL reflects the click rather than once the header
 * re-renders: sorting by a column the seeded data has no metric for returns an
 * empty list, which swaps the table for the empty state and takes the header with
 * it. The `orderBy` param is written either way, so it is the reliable signal.
 */
export async function clickSortHeader(
	page: Page,
	columnId: string,
): Promise<void> {
	const before = new URL(page.url()).searchParams.get('orderBy');
	await sortButton(page, columnId).click();
	await expect(async () => {
		expect(new URL(page.url()).searchParams.get('orderBy')).not.toBe(before);
	}).toPass();
}

/**
 * Drag `columnId`'s grip onto `targetColumnId`'s header to reorder it.
 *
 * dnd-kit only starts a drag once the pointer has moved past its activation
 * distance, so the gesture needs a small nudge before the real travel — a single
 * jump from grip to target is swallowed.
 */
export async function dragColumn(
	page: Page,
	columnId: string,
	targetColumnId: string,
): Promise<void> {
	const grip = page.getByRole('button', { name: dragHandleLabel(columnId) });
	await grip.scrollIntoViewIfNeeded();
	const from = (await grip.boundingBox())!;
	const to = (await headerCell(page, targetColumnId).boundingBox())!;

	await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
	await page.mouse.down();
	// Activation nudge.
	await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2, {
		steps: 4,
	});
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
		steps: 20,
	});
	// Let dnd-kit settle on a drop target before releasing.
	await page.mouse.move(to.x + to.width / 2 + 2, to.y + to.height / 2, {
		steps: 2,
	});
	await page.mouse.up();
}

/**
 * Drag `columnId`'s resize handle right by `deltaX` and return the width it
 * settled on.
 */
export async function resizeColumn(
	page: Page,
	columnId: string,
	deltaX: number,
): Promise<number> {
	const cell = headerCell(page, columnId);
	const before = (await cell.boundingBox())!;
	const handle = cell.locator('[title="Drag to resize column"]');
	await handle.hover();
	await page.mouse.down();
	await page.mouse.move(
		before.x + before.width + deltaX,
		before.y + before.height / 2,
		{ steps: 12 },
	);
	await page.mouse.up();

	await expect(async () => {
		const after = (await cell.boundingBox())!;
		expect(after.width).toBeGreaterThan(before.width + deltaX / 4);
	}).toPass();
	return (await cell.boundingBox())!.width;
}

// There is deliberately no `removeColumn` helper. `TanStackHeaderRow` gates the
// per-header "Remove column" action on `column.enableRemove` being *truthy*, and
// no infra column opts in — so the trigger never renders and such a helper could
// only ever time out. Hiding a column goes through the options panel
// (`toggleColumn`); `columnActionsTrigger` stays so B-LIST-14 can assert the
// absence.

export function sortStateFromUrl(
	page: Page,
): { columnName: string; order: string } | null {
	const raw = new URL(page.url()).searchParams.get('orderBy');
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as { columnName: string; order: string };
	} catch {
		return null;
	}
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export function totalCount(page: Page): Locator {
	return page.getByTestId(PAGINATION.totalCount);
}

export function paginationWarning(page: Page): Locator {
	return page.getByTestId(PAGINATION.warningPopover);
}

export async function setPageSize(page: Page, size: number): Promise<void> {
	await page.getByTestId(PAGINATION.pageSize).click();
	await page.getByRole('option', { name: String(size), exact: true }).click();
	await expect(page).toHaveURL(new RegExp(`pageSize=${size}\\b`));
}

export async function gotoPage(page: Page, pageNumber: number): Promise<void> {
	// `@signozhq/ui/pagination` exposes no testids of its own; the page buttons
	// are reachable by their accessible name.
	await page
		.getByRole('button', { name: String(pageNumber), exact: true })
		.click();
	await expect(page).toHaveURL(new RegExp(`page=${pageNumber}\\b`));
}

/** The row keys currently rendered, in order — for "page 2 differs from page 1". */
export async function renderedRowKeys(page: Page): Promise<string[]> {
	const ids = await dataRows(page).evaluateAll((rows) =>
		rows.map((row) => row.getAttribute('data-testid') ?? ''),
	);
	return ids.map((id) => id.replace(/^row-/, ''));
}

// ─── Group by ────────────────────────────────────────────────────────────────

export function groupBySelect(page: Page): Locator {
	return page.getByTestId(TABLE_TOOLBAR.groupBySelect);
}

/** Group the list through the toolbar's "Group by" select. */
export async function groupListBy(
	page: Page,
	attribute: string,
): Promise<void> {
	const select = groupBySelect(page);
	await expect(select).toBeVisible();

	// antd Select: its search input is readonly until the dropdown opens, so
	// click first and type through the keyboard. Then pick the exact option —
	// `hasText` would also match longer keys containing this one.
	await select.click();
	await page.keyboard.type(attribute);
	await page.locator(`.ant-select-item-option[title="${attribute}"]`).click();

	await expect(page).toHaveURL(
		new RegExp(`groupBy=[^&]*${attribute.replace(/\./g, '\\.')}`),
	);
	// Close the dropdown so it stops covering the table rows.
	await page.keyboard.press('Escape');
}

/** Clear grouping through the select's `allowClear` affordance. */
export async function clearGrouping(page: Page): Promise<void> {
	const select = groupBySelect(page);
	await select.hover();
	await select.locator('.ant-select-clear').click();
	await expect(async () => {
		expect(new URL(page.url()).searchParams.get('groupBy')).toBeNull();
	}).toPass();
}

export function groupByFromUrl(page: Page): string[] {
	const raw = new URL(page.url()).searchParams.get('groupBy');
	if (!raw) {
		return [];
	}
	const parsed = JSON.parse(raw) as (string | { key: string })[];
	return parsed.map((entry) => (typeof entry === 'string' ? entry : entry.key));
}

export function groupRowFor(page: Page, groupLabel: string): Locator {
	return page.getByRole('row').filter({ hasText: groupLabel }).first();
}

/**
 * Press Back until the URL matches `pattern`, at most `limit` times.
 *
 * Some destinations rewrite their own URL on arrival — the metrics explorer fills
 * in the query keys the compass did not send — and that rewrite is a history
 * *push*, so a single Back only returns to the destination's own first URL. The
 * bound keeps a genuinely trapped back button failing rather than looping. It
 * lives here because `playwright/no-conditional-in-test` (rightly) rejects the
 * loop inside a spec.
 */
export async function goBackUntil(
	page: Page,
	pattern: RegExp,
	limit = 4,
): Promise<void> {
	// One Back per retry rather than a tight loop: `goBack()` resolves on load, and
	// the destination can rewrite its URL *after* that — so a tight loop reads a URL
	// that is about to change and stops one entry short.
	await expect(async () => {
		if (!pattern.test(page.url())) {
			await page.goBack();
		}
		expect(page.url()).toMatch(pattern);
	}).toPass({ timeout: limit * 5_000 });
}

/**
 * Scroll `target` to the middle of the viewport before interacting with it.
 *
 * Playwright's own auto-scroll aligns to the *nearest* edge, which for a row near
 * the bottom of the table parks it underneath the sticky pagination bar — the
 * click then waits out its timeout with "element is visible, enabled and stable"
 * while `elementFromPoint` returns the pagination container. Centring is what a
 * user's scroll does and clears both sticky edges.
 */
export async function scrollToCentre(target: Locator): Promise<void> {
	await target.evaluate((element) =>
		element.scrollIntoView({ block: 'center', inline: 'nearest' }),
	);
}

/**
 * Expand the grouped row whose label cell holds `groupLabel`, retrying because
 * the row can detach while the list settles.
 *
 * Two things the obvious version gets wrong. The button is a **toggle**, so a
 * retry that clicks unconditionally collapses what the previous attempt opened
 * and the loop can never converge — hence the `aria-expanded` guard. And the
 * retry budget has to stay under the test timeout, or a genuine failure is
 * reported as a bare "Test timeout of 30000ms exceeded" with no assertion and no
 * steps, which is unusable.
 */
export async function expandGroupRow(
	page: Page,
	groupLabel: string,
): Promise<Locator> {
	const row = groupRowFor(page, groupLabel);
	await expect(row).toBeVisible();
	const container = page.getByTestId('expanded-table-container');

	await expect(async () => {
		const button = row.getByTestId('expand-row-button');
		if ((await button.getAttribute('aria-expanded')) !== 'true') {
			await scrollToCentre(button);
			await button.click({ timeout: 5_000 });
		}
		await expect(container).toBeVisible({ timeout: 3_000 });
	}).toPass({ timeout: 15_000 });

	return container;
}

export async function collapseGroupRow(
	page: Page,
	groupLabel: string,
): Promise<void> {
	await groupRowFor(page, groupLabel).getByTestId('expand-row-button').click();
	await expect(page.getByTestId('expanded-table-container')).toBeHidden();
}

export function expandedTable(page: Page): Locator {
	return page.getByTestId('expanded-table');
}

export function expandedRows(page: Page): Locator {
	return expandedTable(page).locator('tbody tr');
}

export function viewAllButton(page: Page): Locator {
	return page.getByTestId('expanded-row-view-all');
}

export function expandedFromUrl(page: Page): string[] {
	const raw = new URL(page.url()).searchParams.get('expanded');
	return raw ? (JSON.parse(raw) as string[]) : [];
}

/** `K8sExpandedRow` sanitises the row key into its own `orderBy_*` param. */
export function expandedOrderByParam(rowKey: string): string {
	return `orderBy_${rowKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * The expanded table's own sort state, read off whichever `orderBy_<rowKey>`
 * param is currently in the URL. Returns `null` when the nested table is
 * unsorted — which is also how "collapsing cleared it" is asserted.
 */
export function expandedSortState(
	page: Page,
): { param: string; columnName: string; order: string } | null {
	const entry = [...new URL(page.url()).searchParams.entries()].find(([key]) =>
		key.startsWith('orderBy_'),
	);
	if (!entry) {
		return null;
	}
	const [param, raw] = entry;
	const parsed = JSON.parse(raw) as { columnName: string; order: string };
	return { param, ...parsed };
}

/** Sort the expanded table by its first sortable header. */
export async function sortExpandedTable(page: Page): Promise<void> {
	await expandedTable(page)
		.locator('button.tanstack-header-title')
		.first()
		.click();
	await expect(async () => {
		expect(
			expandedSortState(page),
			'expanded-row sort landed in the URL',
		).not.toBeNull();
	}).toPass();
}

// ─── Options side panel ──────────────────────────────────────────────────────

export async function openOptionsPanel(page: Page): Promise<Locator> {
	await page.getByTestId(TABLE_TOOLBAR.optionsButton).click();
	const panel = page.getByRole('dialog').filter({ hasText: 'Options' });
	await expect(panel).toBeVisible();
	return panel;
}

export function columnToggle(page: Page, columnId: string): Locator {
	return page.getByTestId(`toggle-column-${columnId}`);
}

/** Set a column's visibility from the options panel. Panel must already be open. */
export async function toggleColumn(
	page: Page,
	columnId: string,
	on: boolean,
): Promise<void> {
	const toggle = columnToggle(page, columnId);
	await expect(toggle).toBeVisible();
	const isOn = (await toggle.getAttribute('aria-checked')) === 'true';
	if (isOn !== on) {
		await toggle.click();
	}
	await expect(toggle).toHaveAttribute('aria-checked', String(on));
}

export function fontSizeOption(
	page: Page,
	size: 'small' | 'medium' | 'large',
): Locator {
	return page.getByTestId(`font-size-${size}`);
}

export const LINE_CLAMP = {
	input: 'line-clamp-input',
	increase: 'line-clamp-increase',
	decrease: 'line-clamp-decrease',
} as const;

// ─── Quick filters ───────────────────────────────────────────────────────────

export function quickFilterRail(page: Page): Locator {
	return page.getByTestId('checkbox-filter-v2');
}

export function quickFilterSection(page: Page, title: string): Locator {
	return page
		.getByTestId('checkbox-filter-v2')
		.filter({
			has: page.getByTestId('checkbox-filter-header').filter({
				// The header grows a "Clear" affordance the moment the section has a
				// selection, so a `^title$` match silently stops resolving after the
				// first tick — every later step then fails with "element(s) not found"
				// while the screenshot plainly shows the section. Anchors stay (so
				// `Cluster` cannot match `Cluster Name`) with the suffix made optional.
				hasText: new RegExp(`^${escapeRegExp(title)}(\\s*Clear)?$`),
			}),
		})
		.first();
}

/** Quick-filter section titles, in render order. */
export async function quickFilterTitles(page: Page): Promise<string[]> {
	const titles = await page
		.getByTestId('checkbox-filter-header')
		.allInnerTexts();
	// The header also renders a "Clear" affordance when values are selected.
	return titles.map((text) => text.replace(/\s*Clear\s*$/, '').trim());
}

export async function quickFilterOpenState(
	page: Page,
	title: string,
): Promise<'open' | 'closed'> {
	const state = await quickFilterSection(page, title)
		.getByTestId('checkbox-filter-header')
		.getAttribute('data-state');
	return state === 'open' ? 'open' : 'closed';
}

export async function expandQuickFilterSection(
	page: Page,
	title: string,
): Promise<void> {
	if ((await quickFilterOpenState(page, title)) === 'closed') {
		await quickFilterSection(page, title)
			.getByTestId('checkbox-filter-header')
			.click();
	}
	await expect(
		quickFilterSection(page, title).getByTestId('checkbox-filter-header'),
	).toHaveAttribute('data-state', 'open');
}

/**
 * Tick a value in a quick-filter section. Retried: the value list refetches as
 * the time range and list requests settle, so a row can detach mid-click.
 */
export async function pickQuickFilter(
	page: Page,
	section: string,
	value: string,
): Promise<void> {
	await expandQuickFilterSection(page, section);
	const panel = quickFilterSection(page, section);
	// The value list is a *truncated* top-N of the attribute's values, and the
	// shared stack accumulates every worker's seeded entities, so a freshly seeded
	// name is usually not in the first page of it. The section's own search box is
	// how a user finds it, and it is the only reliable way to reach the row.
	const search = panel.getByTestId('checkbox-filter-search');
	if ((await search.count()) > 0) {
		await search.fill(value);
	}

	const row = panel.getByTestId(`checkbox-value-row-${value}`);
	await expect(async () => {
		await expect(row).toBeVisible({ timeout: 5_000 });
		await row.locator('button[role="checkbox"]').click();
		expect(readExpression(page)).toContain(value);
	}).toPass({ timeout: 30_000 });
}

export async function clearQuickFilterSection(
	page: Page,
	section: string,
): Promise<void> {
	await quickFilterSection(page, section)
		.getByTestId('checkbox-filter-clear-all')
		.click();
}

export function quickFiltersToggle(page: Page): Locator {
	return page.getByTestId('quick-filters-toggle');
}

// ─── Hosts-only: the status filter ───────────────────────────────────────────

export async function setStatusFilter(
	page: Page,
	value: 'all' | 'active' | 'inactive',
): Promise<void> {
	// Retry the click, not just the assertion: the toggle group re-renders as each
	// list request settles, so a click during that window lands on a detaching
	// element and is swallowed — leaving the previous filter in the URL.
	await expect(async () => {
		await page.getByTestId(`status-filter-${value}`).click();
		const param = new URL(page.url()).searchParams.get('statusFilter');
		expect(param ?? '').toBe(value === 'all' ? '' : value);
	}).toPass();
}

// ─── Misc ────────────────────────────────────────────────────────────────────

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function instrumentationCallout(page: Page): Locator {
	return page.getByTestId('instrumentation-checks-recheck-btn');
}
