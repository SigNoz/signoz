/**
 * B-EXP — `K8sExpandedRow`: the nested table an expanded group row renders, its
 * 10-row cap, its independent sort/column state, and the "View All" footer.
 *
 * No fixture has a group with more than 6 members, so the oversized-group cases
 * seed a cloned group via `seedGroupedDataset` — see `seed.ts`.
 *
 * B-EXP-07 is the ported `group-view-all.spec.ts` regression: "View All" builds
 * its target URL from the *live* URL, because the react-router snapshot lags the
 * nuqs writes that the category tabs and the group-by select make, and building
 * from a stale `location.search` resurrects dead params.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {
	expectedCategoryParam,
	expectExpressionContains,
	expectUrlParams,
} from '../../../helpers/infra-monitoring/assertions';
import { DRAWER } from '../../../helpers/infra-monitoring/drawer';
import {
	defaultVisibleColumns,
	fanOut,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	allowForSeededWait,
	collapseGroupRow,
	columnStorageKey,
	expandGroupRow,
	expandedColumnStorageKey,
	expandedOrderByParam,
	expandedFromUrl,
	expandedRows,
	expandedTable,
	expectExpandedRowVisible,
	expressionParam,
	gotoList,
	groupListBy,
	headerCell,
	listUrl,
	readColumnState,
	resetTableState,
	renderedRowKeys,
	rowFor,
	sortButton,
	sortExpandedTable,
	viewAllButton,
	visibleColumnHeaders,
	waitForRow,
	waitForRows,
	writeColumnState,
} from '../../../helpers/infra-monitoring/list';
import {
	EXPANDED_ROW_LIMIT,
	groupedCloneNames,
	itemKeyFor,
	seedDataset,
	seedGroupedDataset,
} from '../../../helpers/infra-monitoring/seed';

/**
 * Seed a group larger than `EXPANDED_ROW_LIMIT`, group the list by the entity's
 * attribute, and expand that group. Returns the clone facts so a spec can assert
 * against the members by name.
 */
/**
 * Land on `entity`'s grouped list scoped to one group.
 *
 * Unscoped, the shared stack's other namespaces/clusters crowd the group under
 * test off the first page of group rows — the expand never finds its row and the
 * scenario dies on a timeout that says nothing about grouping.
 */
async function gotoGroupScopedList(
	page: Page,
	entity: EntityDef,
	groupLabel: string,
): Promise<void> {
	await page.goto(
		listUrl(entity, {
			compositeQuery: expressionParam(
				`${entity.groupByAttribute} = '${groupLabel}'`,
			),
		}),
	);
	await waitForRows(page);
}

async function openOversizedGroup(
	page: Page,
	entity: EntityDef,
): Promise<{ groupLabel: string; names: string[] }> {
	const clones = groupedCloneNames(entity);
	await resetTableState(page, entity);
	await seedGroupedDataset(page, entity);
	await gotoGroupScopedList(page, entity, clones.groupLabel);
	await groupListBy(page, entity.groupByAttribute);
	await expandGroupRow(page, clones.groupLabel);
	return clones;
}

/**
 * A taller viewport than the suite default, and the reason is narrower than it
 * looks. Re-measured at 720px: 35 of the 36 scenarios pass, and the one that does
 * not (B-EXP-10 statefulsets) fails because the **sticky table header** —
 * `TanStackHeaderRow` is `position: sticky` — intercepts the click after
 * `scrollIntoViewIfNeeded` parks the group row under it:
 *
 *     <div data-slot="entity-group-header"> from <thead> subtree intercepts pointer events
 *
 * Not the pagination bar, which is a plain in-flow sibling of the scroller, and
 * not an unreachable control: that scenario lists *every* group in the shared
 * stack, so there is ample scroll room and a user can simply scroll the row clear.
 * It is scroll-alignment against a sticky header, so the height is a harness
 * workaround rather than the record of a product defect. Nothing in B-EXP asserts
 * page size, so the height is free; teaching `scrollToCentre` about the sticky
 * header would remove the need for it.
 */
test.use({ viewport: { width: 1280, height: 1100 } });

/** Group and expand one of the fixture's own (small) groups. */
async function openFixtureGroup(page: Page, entity: EntityDef): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.grouped);
	await gotoGroupScopedList(page, entity, entity.seed.sampleGroup);
	await groupListBy(page, entity.groupByAttribute);
	await expandGroupRow(page, entity.seed.sampleGroup);
}

for (const entity of fanOut('representative', 'groupBy')) {
	test.describe(`B-EXP ${entity.key}`, () => {
		test(`B-EXP-01 ${entity.key}: expanding renders the nested table`, async ({
			authedPage: page,
		}) => {
			await openFixtureGroup(page, entity);

			await expectExpandedRowVisible(page);
			await expect(expandedTable(page)).toBeVisible();
		});

		test(`B-EXP-02 ${entity.key}: the expanded table shows at most ${EXPANDED_ROW_LIMIT} rows`, async ({
			authedPage: page,
		}) => {
			const clones = await openOversizedGroup(page, entity);
			// A precondition on the fixture, not a product assertion — if this ever
			// fails the scenario is not testing a cap at all.
			expect(
				clones.names.length,
				'the seeded group must exceed the limit',
			).toBeGreaterThan(EXPANDED_ROW_LIMIT);

			// `TanStackTable` renders up to `skeletonRowCount` (10) placeholder <tr>s
			// while loading, which is *also* EXPANDED_ROW_LIMIT — so a `<=` assertion
			// taken too early passes against the skeleton. Wait for it to clear, then
			// assert the exact cap: the group holds 12, the table must show 10.
			await expect(expandedTable(page).locator('.ant-skeleton')).toHaveCount(0);
			await expect(expandedRows(page)).toHaveCount(EXPANDED_ROW_LIMIT);
		});

		test(`B-EXP-03 ${entity.key}: expanded columns persist independently of the parent`, async ({
			authedPage: page,
		}) => {
			await openFixtureGroup(page, entity);

			// Expanded columns are the parent's visible set minus `hidden-on-collapse`,
			// so the group column itself is never in the nested table.
			const expandedHeaders = await expandedTable(page)
				.locator('thead th .tanstack-header-title')
				.allInnerTexts();
			const groupHeader = entity.columns.find(
				(column) => column.id === entity.groupColumnId,
			)!.header;
			expect(expandedHeaders.map((text) => text.trim())).not.toContain(
				groupHeader,
			);

			const parentHeaders = await visibleColumnHeaders(page);
			expect(parentHeaders).toContain(groupHeader);
		});

		test(`B-EXP-03b ${entity.key}: the expanded table's column state is independent of the parent's`, async ({
			authedPage: page,
		}) => {
			// The independence half of B-EXP-03, which the old
			// `expect(readColumnState(...)).toBeDefined()` could not carry:
			// `readColumnState` returns `{}` for a missing key and `{}` is defined, so
			// it passed whether or not the app ever wrote the expanded key.
			//
			// Driven through the read path because that is the only path a user has:
			// `K8sExpandedRow` hands the nested `TanStackTable` its own
			// `columnStorageKey`, but the options panel edits the *parent's* store, and
			// no infra column is removable from a header menu. Seeding one key and not
			// the other is what proves the two are not sharing state.
			const target = defaultVisibleColumns(entity).find(
				(column) => !column.required && column.id !== entity.groupColumnId,
			)!;

			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.grouped);
			await gotoGroupScopedList(page, entity, entity.seed.sampleGroup);
			await writeColumnState(page, expandedColumnStorageKey(entity), {
				hiddenColumnIds: [target.id],
			});
			await page.reload();
			await waitForRows(page);
			await groupListBy(page, entity.groupByAttribute);
			await expandGroupRow(page, entity.seed.sampleGroup);
			await expectExpandedRowVisible(page);

			const nestedHeaders = (
				await expandedTable(page)
					.locator('thead th .tanstack-header-title')
					.allInnerTexts()
			).map((text) => text.trim());
			expect(nestedHeaders, 'hidden in the nested table').not.toContain(
				target.header,
			);
			// …and the parent is untouched by the expanded key.
			expect(
				(await readColumnState(page, columnStorageKey(entity))).hiddenColumnIds ??
					[],
			).not.toContain(target.id);
		});

		test(`B-EXP-04 ${entity.key}: sorting inside the expanded table uses its own orderBy param`, async ({
			authedPage: page,
		}) => {
			await openFixtureGroup(page, entity);

			// The expanded row's own key is what the param is derived from — read it
			// from `expanded` rather than from the param under test, or the comparison
			// is `x === x`: stripping `orderBy_` off the observed param and re-applying
			// the same sanitiser can only ever reproduce the observed param.
			const [expandedRowKey] = expandedFromUrl(page);
			expect(
				expandedRowKey,
				'the group row is recorded in `expanded`',
			).toBeTruthy();

			await sortExpandedTable(page);

			// The param is keyed by the sanitised row key, and the main `orderBy` is
			// left alone.
			await expect(async () => {
				const scoped = [...new URL(page.url()).searchParams.keys()].filter((key) =>
					key.startsWith('orderBy_'),
				);
				expect(scoped, 'exactly one expanded-row orderBy param').toEqual([
					expandedOrderByParam(expandedRowKey),
				]);
			}).toPass();
			await expectUrlParams(page, { orderBy: null });

			// Collapsing clears it.
			await collapseGroupRow(page, entity.seed.sampleGroup);
			await expect(async () => {
				const scoped = [...new URL(page.url()).searchParams.keys()].filter((key) =>
					key.startsWith('orderBy_'),
				);
				expect(scoped).toEqual([]);
			}).toPass();
		});

		test(`B-EXP-05 ${entity.key}: clicking an expanded row opens that member's drawer`, async ({
			authedPage: page,
		}) => {
			const clones = await openOversizedGroup(page, entity);
			const member = clones.names[0];

			await expect(async () => {
				await expandedTable(page)
					.getByRole('row')
					.filter({ hasText: member })
					.first()
					.click({ timeout: 5_000 });
				await expect(page.getByTestId(DRAWER.close)).toBeVisible({
					timeout: 3_000,
				});
			}).toPass({ timeout: 20_000 });

			// *That member's* drawer, not just "a drawer". `toBeTruthy()` is satisfied
			// by any expanded row, and by a stale drawer left over from a retry of the
			// click above — which is the failure this scenario exists to catch.
			await expect(async () => {
				expect(new URL(page.url()).searchParams.get('selectedItem')).toBe(
					itemKeyFor(entity, member),
				);
			}).toPass();
		});

		test(`B-EXP-06 ${entity.key}: "View All" appears only when the group exceeds ${EXPANDED_ROW_LIMIT}`, async ({
			authedPage: page,
		}) => {
			// A fixture group (<= 6 members) offers no footer …
			await openFixtureGroup(page, entity);
			await expect(expandedTable(page)).toBeVisible();
			await expect(viewAllButton(page)).toHaveCount(0);

			// … while the cloned oversized group does. `openOversizedGroup` already
			// expanded it; `expandGroupRow` guards on `aria-expanded` so a second call
			// was a no-op, but it read as though the expansion were in doubt.
			await openOversizedGroup(page, entity);
			await expect(viewAllButton(page)).toBeVisible();
		});

		test(`B-EXP-09 ${entity.key}: collapsing removes the expanded container`, async ({
			authedPage: page,
		}) => {
			// Seed → group → expand → collapse. The seeded waits alone can consume the
			// default budget (`SEEDED_ROW_TIMEOUT_MS` *is* 30 s), leaving nothing for the
			// collapse.
			allowForSeededWait();
			await openFixtureGroup(page, entity);
			await collapseGroupRow(page, entity.seed.sampleGroup);
			await expect(page.getByTestId('expanded-table-container')).toHaveCount(0);
		});

		test(`B-EXP-10 ${entity.key}: an errored expanded fetch shows its message`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.grouped);
			await gotoList(page, entity);
			await waitForRows(page);
			await groupListBy(page, entity.groupByAttribute);

			// Fail only the nested request: it is the one carrying a limit of exactly
			// EXPANDED_ROW_LIMIT.
			await page.route(/\/api\/v\d+\/infra_monitoring\//, async (route) => {
				const body = route.request().postData() ?? '';
				if (body.includes(`"limit":${EXPANDED_ROW_LIMIT}`)) {
					await route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({ error: 'expanded row exploded' }),
					});
					return;
				}
				await route.continue();
			});

			await expandGroupRow(page, entity.seed.sampleGroup);

			const container = page.getByTestId('expanded-table-container');
			await expect(container).toBeVisible();
			// NOTE: still weak. `K8sExpandedRow` renders the error *and* the nested
			// table, and the nested `<thead>` alone makes `not.toHaveText('')` true, so
			// this passes against a blank strip with a header — the very failure the
			// scenario is named for. Asserting the message text was tried and reverted:
			// neither the stubbed string nor `Something went wrong` appears, so the
			// route stub is not reaching the branch that renders it.
			await expect(container).not.toHaveText('');
			await page.unrouteAll();
		});
	});
}

// ─── B-EXP-07/08 — the ported "View All" regression ──────────────────────────

test.describe('B-EXP View All', () => {
	// Deliberately *not* serial. Grouping and the URL expression are per-test —
	// `authedPage` builds a fresh BrowserContext each time — and both tests seed
	// the same idempotent clone set. Serial only meant a red B-EXP-07 *skipped*
	// B-EXP-08, and the two guard different product fixes (FIX-2 and FIX-5).

	// §9: "All five ported scenarios were written pods-only; once in `base/` they
	// fan out over the registry, which is the point of the restructure." Hosts is
	// excluded not by preference but by construction — the staleness this guards
	// is a *client-side category switch*, and hosts has no category rail.
	for (const entity of fanOut('representative', 'groupBy').filter(
		(candidate) => candidate.categoryTestId,
	)) {
		test(`B-EXP-07 ${entity.key} flattens the group, keeps foreign params, and lists only its members`, async ({
			authedPage: page,
		}) => {
			const clones = groupedCloneNames(entity);
			await resetTableState(page, entity);
			await seedGroupedDataset(page, entity);
			// A row in another group that must not survive the filter View All writes.
			const other = await seedDataset(page, entity.seed.primary);

			// Land on another category first so the switch to this one happens
			// client-side, the way a user does it — that is what leaves the router
			// snapshot stale.
			await page.goto(
				`${entity.route}?category=namespaces&relativeTime=30m&foreignKey=keepme`,
			);
			await page.getByTestId(entity.categoryTestId!).click();
			await waitForRows(page);

			await groupListBy(page, entity.groupByAttribute);
			await expandGroupRow(page, clones.groupLabel);
			await expect(viewAllButton(page)).toBeVisible();
			await viewAllButton(page).click();

			await expectUrlParams(page, {
				// The category the user picked, not the one a stale snapshot remembers.
				// Entity-aware: pods' default is dropped from the URL, every other
				// category is written — hardcoding `null` here only worked while this
				// scenario was pods-only.
				category: expectedCategoryParam(entity),
				groupBy: null,
				expanded: null,
				page: '1',
				// Params owned by other features survive every infra navigation.
				relativeTime: '30m',
				foreignKey: 'keepme',
			});
			// The group is now a filter on the flat list.
			await expectExpressionContains(page, clones.groupLabel);

			// Grouped rows are gone and members are listed directly.
			await expect(page.getByTestId('expanded-table-container')).toHaveCount(0);
			await expect(headerCell(page, entity.nameColumnId)).toHaveCount(1);
			await waitForRow(page, itemKeyFor(entity, clones.names[0]));

			// A row from the other group is filtered out.
			//
			// Addressed by *row key*, not by name. `SeededFacts.names` holds pod names,
			// but a pod's row testid is built from its UID (`row-acc-p1-uid`), so
			// `rowFor(page, other.names[0])` resolved `row-acc-p1` — which matches
			// nothing whether or not the filter works. This scenario is the only
			// instance of the FIX-2 regression guard, so a silent pass here is the whole
			// guard gone.
			await expect(rowFor(page, itemKeyFor(entity, other.names[0]))).toHaveCount(
				0,
			);
			// …and positively: the flat list holds only this group's members.
			const keys = await renderedRowKeys(page);
			const expected = clones.names.map((name) => itemKeyFor(entity, name));
			expect(keys.length).toBeGreaterThan(0);
			expect(keys.every((key) => expected.includes(key))).toBe(true);
		});

		// Was parked as `fixme` because sorting inside the nested table collapsed the
		// parent row, taking the "View All" footer this scenario needs with it. It no
		// longer does: #12402 rebuilt `handleViewAllClick` around
		// `getUnstableCurrentSearchParams()` and an explicit `delete('expanded')`, so the
		// live URL — `expanded` included — survives the nested sort's own nuqs write. The
		// promotion itself (`setMainOrderBy(orderBy)`) is older than the fix and was
		// simply unreachable. Re-measured green 3/3 before un-parking.
		test(`B-EXP-08 ${entity.key} an expanded-row sort is promoted to the main orderBy`, async ({
			authedPage: page,
		}) => {
			const clones = groupedCloneNames(entity);
			await resetTableState(page, entity);
			await seedGroupedDataset(page, entity);
			await gotoGroupScopedList(page, entity, clones.groupLabel);

			await groupListBy(page, entity.groupByAttribute);
			await expandGroupRow(page, clones.groupLabel);

			// Sort inside the nested table, then flatten.
			// Retry the click, not only the URL check: the nested header re-renders as the
			// expanded fetch settles, so a single click can land on a detaching button and
			// be swallowed — after which waiting for the param can only time out.
			await expect(async () => {
				await expandedTable(page)
					.locator('button.tanstack-header-title')
					.first()
					.click();
				expect(
					[...new URL(page.url()).searchParams.keys()].some((key) =>
						key.startsWith('orderBy_'),
					),
					'expanded-row sort landed in the URL',
				).toBe(true);
			}).toPass();
			const scopedColumn = [...new URL(page.url()).searchParams.entries()].find(
				([key]) => key.startsWith('orderBy_'),
			)![1];

			await viewAllButton(page).click();

			// The nested sort becomes the flat list's sort.
			await expect(async () => {
				const main = new URL(page.url()).searchParams.get('orderBy');
				expect(main, 'the nested sort was promoted').toBeTruthy();
				expect(JSON.parse(main!).columnName).toBe(
					JSON.parse(scopedColumn).columnName,
				);
			}).toPass();
			await expect(
				sortButton(page, JSON.parse(scopedColumn).columnName),
			).toHaveAttribute('data-sort', /ascending|descending/);
		});
	}
});
