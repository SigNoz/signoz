/**
 * Registry-driven assertions. Every expected value comes from `entities.ts`, so
 * an `all`-level scenario is one loop over data rather than ten hand-written
 * tests — and a product change that shifts a header, a label or a tab has to
 * update the registry to go green.
 */

import { expect, type Page } from '@playwright/test';

import {
	defaultVisibleColumns,
	hiddenByDefaultColumns,
	type EntityDef,
} from './entities';
import {
	drawer,
	drawerTab,
	expectDrawerBodyReady,
	renderedTabViews,
	tabBar,
	chartHeaders,
	DRAWER_TAB,
	type DrawerView,
} from './drawer';
import {
	headerCell,
	readColumnState,
	readExpression,
	visibleColumnHeaders,
	columnStorageKey,
	quickFilterOpenState,
	quickFilterTitles,
	totalCount,
	type ColumnState,
} from './list';

// ─── Columns ─────────────────────────────────────────────────────────────────

/** Exactly these column ids have a header cell, and nothing else does. */
export async function expectVisibleColumns(
	page: Page,
	entity: EntityDef,
	ids: string[],
): Promise<void> {
	await expect(async () => {
		const rendered = await visibleColumnHeaders(page);
		const expected = ids.map(
			(id) => entity.columns.find((column) => column.id === id)?.header ?? id,
		);
		expect(rendered).toEqual(expected);
	}).toPass();
}

/**
 * The table shows the registry's default-visible set, and every
 * `hiddenByDefault` column is absent from the header row.
 */
export async function expectDefaultColumns(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	const expected = defaultVisibleColumns(entity).map((column) => column.header);
	await expect(async () => {
		expect(await visibleColumnHeaders(page)).toEqual(expected);
	}).toPass();

	for (const column of hiddenByDefaultColumns(entity)) {
		await expect(headerCell(page, column.id)).toHaveCount(0);
	}
}

export async function expectColumnState(
	page: Page,
	entity: EntityDef,
	matcher: (state: ColumnState) => void,
): Promise<void> {
	await expect(async () => {
		matcher(await readColumnState(page, columnStorageKey(entity)));
	}).toPass();
}

// ─── URL ─────────────────────────────────────────────────────────────────────

/**
 * Assert URL params. A `null` expectation means "this param must be absent" —
 * which is how the default-dropping params (`category=pods`) are pinned.
 */
export async function expectUrlParams(
	page: Page,
	expected: Record<string, string | null>,
): Promise<void> {
	await expect(async () => {
		const params = new URL(page.url()).searchParams;
		for (const [key, value] of Object.entries(expected)) {
			expect(params.get(key), `url param ${key}`).toBe(value);
		}
	}).toPass();
}

/**
 * The list is on page 1.
 *
 * One URL key, three writers, and nuqs only clears a param whose value equals its
 * default — so "page one" has three spellings:
 *
 * - `useTableParams` binds `page` as `parseAsInteger.withDefault(pageDefault)`, so
 *   page one *is* the default and the param disappears;
 * - `useInfraMonitoringPageListing` uses a bare `parseAsInteger` with no
 *   `.withDefault`, so there is no default to match and `1` is written literally;
 * - `K8sExpandedRow`'s "View All" sets it through raw `URLSearchParams`.
 *
 * All three mean page one, so absent and `'1'` are both accepted; pinning either
 * literal makes the assertion about which writer ran, not about the page.
 */
export async function expectFirstPage(page: Page): Promise<void> {
	await expect(async () => {
		const value = new URL(page.url()).searchParams.get('page');
		expect(value === null || value === '1', `page param was ${value}`).toBe(true);
	}).toPass();
}

/**
 * The `category` value the URL should carry for `entity` — `null` when absent.
 *
 * Absent for hosts (its own route, no category rail) and for pods (the k8s
 * default, which nuqs drops rather than writes). Any scenario that switches
 * category and then asserts the param has to go through this, or it is really
 * asserting "the entity under test happens to be pods".
 */
export function expectedCategoryParam(entity: EntityDef): string | null {
	if (!entity.categoryTestId || entity.key === 'pods') {
		return null;
	}
	return entity.key;
}

/** The single reader for the filter expression — see `list.applyExpression`. */
export async function expectExpression(
	page: Page,
	expression: string,
): Promise<void> {
	await expect(async () => {
		expect(readExpression(page)).toBe(expression);
	}).toPass();
}

export async function expectExpressionContains(
	page: Page,
	fragment: string,
): Promise<void> {
	await expect(async () => {
		expect(readExpression(page)).toContain(fragment);
	}).toPass();
}

// ─── Pagination label ────────────────────────────────────────────────────────

/**
 * `pagination-total-count` reads `Showing 1 - N of T <Label>`, where `<Label>` is
 * the capitalised entity key — `entity.charAt(0).toUpperCase() + entity.slice(1)`
 * in `K8sBaseList`.
 */
export function totalCountLabel(entity: EntityDef): string {
	return entity.key.charAt(0).toUpperCase() + entity.key.slice(1);
}

export async function expectTotalCountLabel(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	await expect(totalCount(page)).toHaveText(
		new RegExp(`^Showing \\d+ - \\d+ of \\d+ ${totalCountLabel(entity)}$`),
	);
}

// ─── Quick filters ───────────────────────────────────────────────────────────

/**
 * Section titles match the registry list in order, and the
 * `quickFilterDefaultOpen` ones are expanded while the rest are collapsed.
 */
export async function expectQuickFilterSections(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	await expect(async () => {
		expect(await quickFilterTitles(page)).toEqual(entity.quickFilterTitles);
	}).toPass();

	for (const title of entity.quickFilterTitles) {
		const expected = entity.quickFilterDefaultOpen.includes(title)
			? 'open'
			: 'closed';
		expect(
			await quickFilterOpenState(page, title),
			`quick-filter section "${title}"`,
		).toBe(expected);
	}
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

/**
 * The metadata row shows the registry labels, in order, each with a non-empty
 * value. Casing is deliberately inconsistent in the source (hosts all-caps,
 * `Statefulset` not `StatefulSet`); this asserts it verbatim so a "tidy-up"
 * rename has to update the registry.
 */
export async function expectMetadataLabels(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	const panel = drawer(page);
	// The label class carries `text-transform: uppercase`, and `innerText` reports
	// the *rendered* text, so every entity except hosts (whose source strings are
	// already caps) would fail a literal comparison. The registry keeps the source
	// casing — the uppercasing is styling, not content — so compare case-blind.
	const normalise = (labels: string[]): string[] =>
		labels.map((label) => label.trim().toUpperCase());
	await expect(async () => {
		const labels = await panel
			.locator('[class*="entityDetailsMetadataLabel"]')
			.allInnerTexts();
		expect(normalise(labels)).toEqual(normalise(entity.metadataLabels));
	}).toPass();

	// One value per rendered label, each non-empty.
	//
	// The count is what makes this falsifiable: `for (i < await values.count())`
	// never runs its body when nothing rendered, so the "non-empty value" half
	// silently held for zero values, and a CSS-module class rename would have
	// turned it into a permanent pass across all ten entities.
	//
	// Counted, so the loop below cannot vacuously pass over zero values — that was
	// the original defect here: `for (i < await values.count())` never ran its body
	// when nothing rendered, and a CSS-module class rename would have made this a
	// permanent pass across all ten entities.
	//
	// NOT counted against `entity.metadataLabels.length`, and not against the
	// rendered label count either: both fail on hosts, whose metadata row renders
	// fewer plain value nodes than it has labels (`STATUS` is a badge, not a value
	// node). Pinning either number is a scenario of its own; what holds everywhere
	// is "at least one value rendered, and none of them are empty".
	const values = panel.locator('[class*="entityDetailsMetadataValue"]');
	await expect(values.first()).toBeVisible();
	const count = await values.count();
	for (let i = 0; i < count; i += 1) {
		await expect(values.nth(i), `metadata value ${i}`).not.toHaveText('');
	}
}

/** The tab bar holds exactly the registry-enabled tabs, in the canonical order. */
export function expectedTabViews(entity: EntityDef): DrawerView[] {
	if (!entity.capabilities.has('tabBar')) {
		return [];
	}
	const views: DrawerView[] = [DRAWER_TAB.metrics];
	if (entity.capabilities.has('logsTab')) {
		views.push(DRAWER_TAB.logs);
	}
	if (entity.capabilities.has('tracesTab')) {
		views.push(DRAWER_TAB.traces);
	}
	if (entity.capabilities.has('eventsTab')) {
		views.push(DRAWER_TAB.events);
	}
	if (entity.capabilities.has('podMetricsTab')) {
		views.push(DRAWER_TAB.podMetrics);
	}
	return views;
}

export async function expectDrawerTabs(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	const expected = expectedTabViews(entity);
	if (expected.length === 0) {
		// `hideDetailViewTabs` — volumes renders no tab bar at all.
		//
		// The body-ready wait is what makes this falsifiable: the drawer shell mounts
		// from `selectedItem` alone and `DrawerTabBar` mounts with the tab body, so a
		// bare `toHaveCount(0)` here resolved on its first poll against a drawer that
		// had not rendered a tab bar *yet*, and would have passed if volumes grew one.
		await expectDrawerBodyReady(page);
		await expect(tabBar(page)).toHaveCount(0);
		return;
	}
	await expect(tabBar(page)).toBeVisible();
	await expect(async () => {
		expect(await renderedTabViews(page)).toEqual(expected);
	}).toPass();
	for (const view of expected) {
		await expect(drawerTab(page, view)).toBeVisible();
	}
}

/** Metrics-tab chart headers match the registry titles, in order. */
export async function expectWidgetTitles(
	page: Page,
	titles: string[],
): Promise<void> {
	await expect(async () => {
		const rendered = await chartHeaders(page).allInnerTexts();
		expect(rendered.map((title) => title.trim())).toEqual(titles);
	}).toPass();
}

// ─── Console / network ───────────────────────────────────────────────────────

/**
 * No console errors and no unexpected 4xx/5xx. Re-exported from `common` so
 * infra specs have one import surface; `watchConsole` must be called before the
 * first navigation.
 */
export { watchConsole } from '../common';
export type { ConsoleWatch } from '../common';
