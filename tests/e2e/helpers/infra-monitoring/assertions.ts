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
 * `useTableParams` binds `page` through `parseAsInteger.withDefault(1)`, and nuqs
 * clears a param equal to its default — so a pagination-driven reset shows up as
 * the param *disappearing*. But a filter-driven reset goes through an explicit
 * write and lands as `page=1`. Both mean page one, so both are accepted; pinning
 * either literal makes the assertion about which writer ran, not about the page.
 */
export async function expectFirstPage(page: Page): Promise<void> {
	await expect(async () => {
		const value = new URL(page.url()).searchParams.get('page');
		expect(value === null || value === '1', `page param was ${value}`).toBe(true);
	}).toPass();
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
	await expect(page.getByTestId('pagination-total-count')).toHaveText(
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

	const values = panel.locator('[class*="entityDetailsMetadataValue"]');
	const count = await values.count();
	for (let i = 0; i < count; i += 1) {
		await expect(values.nth(i)).not.toHaveText('');
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
