/**
 * B-LIST — `K8sBaseList`'s table, parametrised over the entity registry.
 *
 * The component does not branch on entity: the only thing that varies is the
 * config object, so anything the table does is asserted from the registry. Each
 * scenario carries a fan-out level (§4.0 of the plan) — `all` cases are tagged
 * `@wide` so CI can run `--grep-invert @wide` on PRs and the full matrix nightly.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	expectDefaultColumns,
	expectFirstPage,
	expectTotalCountLabel,
	expectUrlParams,
} from '../../../helpers/infra-monitoring/assertions';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	openRowDrawer,
	DRAWER,
} from '../../../helpers/infra-monitoring/drawer';
import {
	defaultVisibleColumns,
	fanOut,
	hiddenByDefaultColumns,
	sortableColumns,
	WIDE_TAG,
	type EntityColumn,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	clickSortHeader,
	columnActionsTrigger,
	columnStorageKey,
	EMPTY_STATE,
	dragColumn,
	dragHandleLabel,
	gotoPage,
	gotoScopedList,
	headerCell,
	headerCells,
	openOptionsPanel,
	pageSizeStorageKey,
	readColumnState,
	renderedRowKeys,
	resizeColumn,
	resetTableState,
	rowFor,
	scopedListUrl,
	setPageSize,
	sortButton,
	sortStateFromUrl,
	switchCategory,
	table,
	toggleColumn,
	visibleColumnHeaders,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import {
	seedDataset,
	type SeededFacts,
} from '../../../helpers/infra-monitoring/seed';

/**
 * Sortable columns that are on screen without touching the options panel.
 * Computed from the registry so a spec body never has to branch on it.
 */
function visibleSortableColumns(entity: EntityDef): EntityColumn[] {
	return sortableColumns(entity).filter((column) => !column.hiddenByDefault);
}

/**
 * Turn on every `hiddenByDefault` column, to force the table wider than its
 * container. A no-op when the entity has none.
 */
async function showAllColumns(page: Page, entity: EntityDef): Promise<void> {
	const hidden = hiddenByDefaultColumns(entity);
	if (hidden.length === 0) {
		return;
	}
	await openOptionsPanel(page);
	for (const column of hidden) {
		await toggleColumn(page, column.id, true);
	}
	await page.keyboard.press('Escape');
}

/**
 * Seed a dataset and land on `entity`'s list showing **only** that dataset's
 * rows.
 *
 * The scoping matters: six workers seed into one ClickHouse, so an unscoped list
 * can push the row under test onto a later page as soon as a sibling spec seeds
 * another dataset for the same entity.
 */
async function openSeededList(
	page: Page,
	entity: EntityDef,
	dataset: DatasetKey = entity.seed.primary as DatasetKey,
	params: Record<string, string> = {},
): Promise<SeededFacts> {
	await resetTableState(page, entity);
	const seeded = await seedDataset(page, dataset);
	await gotoScopedList(page, entity, seeded.names, params);
	await waitForRows(page);
	return seeded;
}

// ─── all-level: the expected value comes from a per-entity table in §3 ────────

for (const entity of fanOut('all')) {
	test.describe(`B-LIST ${entity.key} ${WIDE_TAG}`, () => {
		test(`B-LIST-01 ${entity.key}: default visible columns match the registry`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await expectDefaultColumns(page, entity);
		});

		test(`B-LIST-05 ${entity.key}: total count reads "Showing 1 - N of T ${entity.key}"`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await expectTotalCountLabel(page, entity);
		});

		/**
		 * Every sortable column is clickable and writes its own `orderBy`.
		 *
		 * Only the *first* click of each column is asserted, and each column starts
		 * from a fresh page. The reason is a product behaviour worth knowing: sorting
		 * by a column the `_orderby` fixture has no metric for — `podRestarts`,
		 * `diskUsage`, `inodesUsed` — comes back **empty**, and an empty list swaps
		 * the table for the empty state, taking the header (and any second click)
		 * with it. The full asc → desc → unset cycle is B-LIST-08b's job, on the one
		 * column per entity that is guaranteed to carry data.
		 */
		test(`B-LIST-08a ${entity.key}: every sortable column writes its own orderBy`, async ({
			authedPage: page,
		}) => {
			// Hidden-by-default sortable columns are B-OPT-03's job to reveal first.
			for (const column of visibleSortableColumns(entity)) {
				await openSeededList(page, entity, entity.seed.orderBy as DatasetKey);

				await clickSortHeader(page, column.id);

				expect(sortStateFromUrl(page), `${column.id} asc`).toEqual({
					columnName: column.id,
					order: 'asc',
				});
				// Sorting is a new query, so paging restarts — and page 1 is the
				// default, which nuqs drops from the URL rather than writing.
				await expectFirstPage(page);
			}
		});

		/**
		 * The *rendered* half, on `orderByColumnId` — the one column the entity's
		 * `_orderby` fixture is guaranteed to populate and vary.
		 */
		test(`B-LIST-08b ${entity.key}: sorting ${entity.orderByColumnId} reorders the rows and marks the header`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity, entity.orderByDataset as DatasetKey);
			const columnId = entity.orderByColumnId;

			await clickSortHeader(page, columnId);
			await waitForRows(page);
			await expect(sortButton(page, columnId)).toHaveAttribute(
				'data-sort',
				'ascending',
			);
			const ascending = await renderedRowKeys(page);
			expect(ascending.length, 'more than one row to order').toBeGreaterThan(1);

			await clickSortHeader(page, columnId);
			await waitForRows(page);
			await expect(sortButton(page, columnId)).toHaveAttribute(
				'data-sort',
				'descending',
			);
			const descending = await renderedRowKeys(page);

			// asc vs desc rather than sorted-vs-unsorted: the API's natural order is
			// free to coincide with either direction, so only the two *sorted* orders
			// are guaranteed to differ.
			expect(descending.join(), 'desc differs from asc').not.toBe(
				ascending.join(),
			);
			// Same rows, different order — sorting must not drop or invent any.
			expect([...descending].sort()).toEqual([...ascending].sort());

			await clickSortHeader(page, columnId);
			await expectUrlParams(page, { orderBy: null });
			await expect(sortButton(page, columnId)).toHaveAttribute(
				'data-sort',
				'none',
			);
		});

		test(`B-LIST-09 ${entity.key}: non-sortable columns render no sort button`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			// Split by the registry rather than branching in the body: a sortable
			// header is a `button`, a non-sortable one a plain `span`.
			for (const column of visibleSortableColumns(entity)) {
				await expect(
					headerCell(page, column.id).locator('button.tanstack-header-title'),
					`${column.id} is sortable`,
				).toHaveCount(1);
			}
			for (const column of defaultVisibleColumns(entity).filter(
				(candidate) => !candidate.sortable,
			)) {
				const cell = headerCell(page, column.id);
				await expect(
					cell.locator('button.tanstack-header-title'),
					`${column.id} has no sort button`,
				).toHaveCount(0);
				await expect(
					cell.locator('span.tanstack-header-title'),
					`${column.id} renders a plain title`,
				).toHaveCount(1);
			}
		});

		test(`B-LIST-10 ${entity.key}: row click opens the drawer and writes selectedItem`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await waitForRow(page, entity.seed.sampleItemKey);
			await openRowDrawer(page, entity.seed.sampleItemKey);

			// The entity's `getItemKey` decides which extras get written; a `null`
			// expectation asserts the param is absent.
			await expectUrlParams(page, {
				selectedItem: entity.seed.sampleItemKey,
				selectedItemClusterName: entity.selectedItemExtraParams.includes(
					'clusterName',
				)
					? (entity.seed.sampleClusterName ?? null)
					: null,
				selectedItemNamespaceName: entity.selectedItemExtraParams.includes(
					'namespaceName',
				)
					? (entity.seed.sampleNamespaceName ?? null)
					: null,
			});
		});
	});
}

// ─── representative-level: the four entities span every axis that varies ─────

for (const entity of fanOut('representative')) {
	test.describe(`B-LIST ${entity.key}`, () => {
		/**
		 * The plan's wording for this scenario ("stays visible after scrolling the
		 * table fully right") describes a horizontally-sticky column, and
		 * `TanStackTable` does not implement one: `TanStackHeaderRow` sets
		 * `position: sticky; top: 0` — vertical only — and the only place `pin` is
		 * read is `isDragColumn = enableMove !== false && column.pin == null`.
		 *
		 * So this asserts the contract `pin: 'left'` actually carries: the column
		 * leads the order, exposes no drag grip, and cannot be removed. Horizontal
		 * stickiness is a product gap, not something to fake green here.
		 */
		test(`B-LIST-02 ${entity.key}: pinned columns lead the order and cannot be moved`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			// Widen the table past its container so a sticky implementation, if one
			// ever lands, would have something to stick against.
			await showAllColumns(page, entity);

			const pinned = defaultVisibleColumns(entity).filter(
				(column) => column.pinned === 'left',
			);
			expect(pinned.length, 'entity has a left-pinned column').toBeGreaterThan(0);

			const headers = await visibleColumnHeaders(page);
			for (const [index, column] of pinned.entries()) {
				expect(headers[index], `${column.id} leads the header row`).toBe(
					column.header,
				);
				await expect(
					page.getByRole('button', { name: dragHandleLabel(column.id) }),
					`${column.id} exposes no drag grip`,
				).toHaveCount(0);
				await expect(
					columnActionsTrigger(page, column.id),
					`${column.id} cannot be removed`,
				).toHaveCount(0);
			}
		});

		test(`B-LIST-03 ${entity.key}: the group column is absent when not grouped`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(0);
			expect(await visibleColumnHeaders(page)).not.toContain(
				entity.columns.find((column) => column.id === entity.groupColumnId)?.header,
			);
		});

		test(`B-LIST-06 ${entity.key}: page size lands in the URL, resets page and persists`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity, entity.seed.pagination as DatasetKey, {
				pageSize: '5',
			});
			await gotoPage(page, 2);

			await setPageSize(page, 20);
			// A page-size change restarts paging.
			await expectUrlParams(page, { pageSize: '20' });
			await expectFirstPage(page);

			await expect(async () => {
				const stored = await page.evaluate(
					(key) => localStorage.getItem(key),
					pageSizeStorageKey(entity),
				);
				expect(stored).toContain('20');
			}).toPass();

			await page.reload();
			await waitForRows(page);
			await expectUrlParams(page, { pageSize: '20' });
		});

		test(`B-LIST-07 ${entity.key}: page 2 shows different rows and back returns to page 1`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity, entity.seed.pagination as DatasetKey, {
				pageSize: '5',
			});
			const pageOne = await renderedRowKeys(page);
			expect(pageOne.length).toBeGreaterThan(0);

			await gotoPage(page, 2);
			await waitForRows(page);
			const pageTwo = await renderedRowKeys(page);
			expect(pageTwo).not.toEqual(pageOne);

			await page.goBack();
			await waitForRows(page);
			await expectFirstPage(page);
			await expect(async () => {
				expect(await renderedRowKeys(page)).toEqual(pageOne);
			}).toPass();
		});

		test(`B-LIST-11 ${entity.key}: ctrl+click opens a new tab carrying selectedItem`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await waitForRow(page, entity.seed.sampleItemKey);

			const [opened] = await Promise.all([
				page.context().waitForEvent('page'),
				rowFor(page, entity.seed.sampleItemKey).click({
					modifiers: ['ControlOrMeta'],
				}),
			]);
			await opened.waitForLoadState();

			expect(new URL(opened.url()).searchParams.get('selectedItem')).toBe(
				entity.seed.sampleItemKey,
			);
			// The originating tab must not have opened its own drawer.
			await expect(page.getByTestId(DRAWER.close)).toBeHidden();
			await opened.close();
		});

		test(`B-LIST-12 ${entity.key}: resizing a column persists columnSizing`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			const resizable = defaultVisibleColumns(entity).find(
				(column) => column.id !== entity.nameColumnId,
			);
			expect(resizable, 'entity has a resizable column').toBeDefined();
			const columnId = resizable!.id;

			const cell = headerCell(page, columnId);
			await expect(cell.locator('[title="Drag to resize column"]')).toHaveCount(1);

			const widened = await resizeColumn(page, columnId, 80);

			// The width is persisted under the entity's own column key …
			const stored = await readColumnState(page, columnStorageKey(entity));
			expect(Object.keys(stored.columnSizing ?? {})).toContain(columnId);
			const persisted = stored.columnSizing![columnId];
			expect(persisted).toBeCloseTo(widened, 0);

			// … and restored from it on a cold load.
			await page.reload();
			await waitForRows(page);
			await expect(async () => {
				const after = (await headerCell(page, columnId).boundingBox())!;
				expect(after.width).toBeCloseTo(persisted, 0);
			}).toPass();
		});

		test(`B-LIST-13 ${entity.key}: reordering a column persists columnOrder; pinned columns have no grip`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			const movable = defaultVisibleColumns(entity).filter(
				(column) => !column.pinned,
			);
			expect(movable.length, 'entity has two movable columns').toBeGreaterThan(1);
			const [first, second] = movable;

			// Pinned columns expose no drag grip.
			for (const column of defaultVisibleColumns(entity).filter((c) => c.pinned)) {
				await expect(
					page.getByRole('button', { name: dragHandleLabel(column.id) }),
				).toHaveCount(0);
			}

			await dragColumn(page, first.id, second.id);

			await expect(async () => {
				const headers = await visibleColumnHeaders(page);
				expect(headers.indexOf(first.header)).toBeGreaterThan(
					headers.indexOf(second.header),
				);
			}).toPass();

			const stored = await readColumnState(page, columnStorageKey(entity));
			expect(stored.columnOrder ?? []).toContain(first.id);

			const orderBeforeReload = await visibleColumnHeaders(page);
			await page.reload();
			await waitForRows(page);
			await expect(async () => {
				expect(await visibleColumnHeaders(page)).toEqual(orderBeforeReload);
			}).toPass();
		});

		/**
		 * The plan expects a per-header "Remove column" action. It never renders for
		 * infra: `TanStackHeaderRow` gates it on
		 * `canRemoveColumn && onRemoveColumn && column.enableRemove` — note the last
		 * term is a truthiness check, so `enableRemove` is **opt-in** — and not one
		 * column in any entity's `table.config.tsx` (K8s or hosts) sets it to
		 * `true`; the only occurrences are the `false` on group and name columns.
		 *
		 * So this pins the actual contract: no header action anywhere, and hiding
		 * goes through the options panel (B-OPT-02). Flip this to the plan's version
		 * the day the configs opt in.
		 */
		test(`B-LIST-14 ${entity.key}: no header exposes a remove action; hiding is via the options panel`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);

			for (const column of defaultVisibleColumns(entity)) {
				await expect(
					columnActionsTrigger(page, column.id),
					`${column.id} exposes no column-actions trigger`,
				).toHaveCount(0);
			}

			// The same outcome the plan wanted, through the surface that implements it.
			const hideable = defaultVisibleColumns(entity).find(
				(column) => !column.required && !column.pinned,
			);
			expect(hideable, 'entity has a hideable column').toBeDefined();

			await openOptionsPanel(page);
			await toggleColumn(page, hideable!.id, false);

			await expect(async () => {
				const stored = await readColumnState(page, columnStorageKey(entity));
				expect(stored.hiddenColumnIds ?? []).toContain(hideable!.id);
			}).toPass();
		});

		test(`B-LIST-15 ${entity.key}: the last column has no resize handle`, async ({
			authedPage: page,
		}) => {
			await openSeededList(page, entity);
			await expect(
				headerCells(page).last().locator('[title="Drag to resize column"]'),
			).toHaveCount(0);
		});

		test(`B-LIST-16 ${entity.key}: page, pageSize and orderBy restore on a cold load`, async ({
			authedPage: page,
		}) => {
			// `orderByColumnId` rather than "the first sortable column": sorting by a
			// column the fixture has no metric for returns an empty list, and then
			// there is no header to assert against.
			const orderBy = JSON.stringify({
				columnName: entity.orderByColumnId,
				order: 'desc',
			});

			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.pagination as DatasetKey);
			await gotoScopedList(page, entity, seeded.names, {
				page: '2',
				pageSize: '5',
				orderBy,
			});
			await waitForRows(page);

			await expectUrlParams(page, { page: '2', pageSize: '5', orderBy });
			await expect(sortButton(page, entity.orderByColumnId)).toHaveAttribute(
				'data-sort',
				'descending',
			);
		});

		/**
		 * `skeletonRowCount` placeholder rows stand in while the list request is in
		 * flight, and the empty state is deliberately withheld until the answer
		 * arrives (`showEmptyState = !isLoading && pageData.length === 0`), so
		 * "no results" never flashes on the way to results.
		 */
		test(`B-LIST-04 ${entity.key}: skeleton rows stand in while loading, then give way to rows`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);

			// Hold *every* list response until released, so the loading state is
			// stable. Holding only the first is racy: the query-builder init redirect
			// fires a second list request, which would resolve and paint rows while the
			// first is still parked.
			let release = (): void => {};
			const held = new Promise<void>((resolve) => {
				release = resolve;
			});
			let released = false;
			await page.route(/\/api\/v\d+\/infra_monitoring\//, async (route) => {
				// `/infra_monitoring/checks` serves the instrumentation callout, not the list.
				const isList = !route.request().url().includes('/checks');
				if (isList && !released) {
					await held;
				}
				await route.continue();
			});

			await page.goto(scopedListUrl(entity, seeded.names));

			// Header up, placeholder cells in the body, and no "no results" flash.
			await expect(headerCell(page, entity.nameColumnId)).toBeVisible();
			const skeletons = table(page).locator('.ant-skeleton');
			await expect(skeletons.first()).toBeVisible();
			await expect(page.getByTestId(EMPTY_STATE.empty)).toHaveCount(0);

			released = true;
			release();

			// Placeholders gone, seeded rows in their place.
			await waitForRows(page);
			await expect(skeletons).toHaveCount(0);
			await expect(rowFor(page, entity.seed.sampleItemKey)).toBeVisible();
			await expect(page.getByTestId(EMPTY_STATE.empty)).toHaveCount(0);
			expect(seeded.names.length).toBeGreaterThan(0);
			await page.unrouteAll();
		});
	});
}

// ─── once-level: no per-entity input at all ──────────────────────────────────

/**
 * The largest `scrollTop` on the page — whichever element the virtualiser
 * actually scrolls. Runs in the page via `page.evaluate`, so it must be
 * self-contained.
 */
function maxScrollTop(): number {
	const tops = Array.from(document.querySelectorAll<HTMLElement>('*')).map(
		(el) => el.scrollTop,
	);
	return Math.max(0, ...tops);
}

test.describe('B-LIST cross-entity', () => {
	const [first, second] = fanOut('all').filter(
		(entity) => entity.categoryTestId,
	);

	test('B-LIST-17 switching entity resets the table scroll to the top', async ({
		authedPage: page,
	}) => {
		// The scoped list holds ~7 rows, which does not overflow the config's
		// 1280x720 viewport — so shrink the window rather than depend on however
		// many rows sibling specs happen to have seeded.
		await page.setViewportSize({ width: 1280, height: 400 });
		await resetTableState(page, first);
		const seeded = await seedDataset(page, first.seed.pagination as DatasetKey);
		await gotoScopedList(page, first, seeded.names, { pageSize: '100' });
		await waitForRows(page);

		// Scroll the *table's* scroller — the ancestor of the `<table>` that actually
		// overflows. Scanning every div would pick the left rail's OverlayScrollbar
		// instead, and a row locator is no good either: the virtualiser recycles
		// rows, so `dataRows().last()` detaches mid-action.
		// Scroll with the wheel over the table rather than assigning `scrollTop`:
		// the list is a `TableVirtuoso`, whose scroller is not simply "the first
		// overflowing ancestor of the <table>", and a row locator is no good either
		// because the virtualiser recycles rows mid-action.
		await table(page).hover();
		await page.mouse.wheel(0, 2_000);

		await expect(async () => {
			expect(
				await page.evaluate(maxScrollTop),
				'the table actually scrolled',
			).toBeGreaterThan(0);
		}).toPass();

		await switchCategory(page, second);
		await waitForRows(page);

		// `resetScrollKey={entity}` is supposed to put the new entity's table back
		// at the top.
		await expect(async () => {
			expect(await page.evaluate(maxScrollTop)).toBe(0);
		}).toPass();
	});
});
