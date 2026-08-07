/**
 * B-GRP — grouping the list through the toolbar's "Group by" select.
 *
 * Grouping flips two columns at once: the group column is `hidden-on-collapse`
 * (so it only appears while grouped) and the name column is `hidden-on-expand`
 * (so it disappears). Both come from the registry.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { expectUrlParams } from '../../../helpers/infra-monitoring/assertions';
import { DRAWER } from '../../../helpers/infra-monitoring/drawer';
import {
	fanOut,
	WIDE_TAG,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	clearGrouping,
	expandGroupRow,
	expandedFromUrl,
	expectExpandedRowVisible,
	expressionParam,
	gotoGroupScopedList,
	gotoList,
	groupByFromUrl,
	groupBySelect,
	groupListBy,
	groupRowFor,
	headerCell,
	listUrl,
	resetTableState,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

/**
 * Seed the entity's grouped dataset (plus a cloned oversized group, which the
 * expanded-row scenarios share) and land on its list.
 */
async function openGroupableList(page: Page, entity: EntityDef): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.grouped);
	await gotoList(page, entity);
	await waitForRows(page);
}

/**
 * Same, but scoped to the fixture's own group.
 *
 * Required by every scenario that then reaches for `entity.seed.sampleGroup`:
 * grouped page size is viewport-derived and the shared stack holds every other
 * worker's groups, so on an unscoped list the group under test drifts off page
 * one. §11.1's last row — "never assert set membership against an unscoped list"
 * — was applied to B-GRP-06 and missed on B-GRP-02/05/08.
 */
async function openScopedGroupableList(
	page: Page,
	entity: EntityDef,
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.grouped);
	await gotoGroupScopedList(page, entity, entity.seed.sampleGroup);
}

// ─── all-level ───────────────────────────────────────────────────────────────

for (const entity of fanOut('all', 'groupBy')) {
	test.describe(`B-GRP ${entity.key} ${WIDE_TAG}`, () => {
		test(`B-GRP-02 ${entity.key}: grouping by ${entity.groupByAttribute} swaps the name column for the group column`, async ({
			authedPage: page,
		}) => {
			await openScopedGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);

			expect(groupByFromUrl(page)).toEqual([entity.groupByAttribute]);
			// Grouping is a new query, so paging restarts.
			await expectUrlParams(page, { page: '1' });

			// `hidden-on-collapse` appears, `hidden-on-expand` disappears.
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(1);
			await expect(headerCell(page, entity.nameColumnId)).toHaveCount(0);

			await expect(
				groupRowFor(page, entity.seed.sampleGroup).getByTestId('expand-row-button'),
			).toBeVisible();
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative', 'groupBy')) {
	test.describe(`B-GRP ${entity.key}`, () => {
		test(`B-GRP-01 ${entity.key}: the group-by select offers this entity's attributes`, async ({
			authedPage: page,
		}) => {
			await openGroupableList(page, entity);

			await groupBySelect(page).click();
			const options = page.locator('.ant-select-item-option');
			await expect(options.first()).toBeVisible();
			expect(await options.count()).toBeGreaterThan(0);
			// The attribute the registry groups on must actually be offered.
			await expect(
				page.locator(`.ant-select-item-option[title="${entity.groupByAttribute}"]`),
			).toHaveCount(1);
		});

		test(`B-GRP-03 ${entity.key}: a second attribute appends to groupBy in pick order`, async ({
			authedPage: page,
		}) => {
			await openGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);

			await groupListBy(page, entity.secondGroupByAttribute);

			expect(groupByFromUrl(page)).toEqual([
				entity.groupByAttribute,
				entity.secondGroupByAttribute,
			]);
		});

		test(`B-GRP-04 ${entity.key}: clearing grouping restores the flat table`, async ({
			authedPage: page,
		}) => {
			await openGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(1);

			await clearGrouping(page);

			await expectUrlParams(page, { groupBy: null });
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(0);
			await expect(headerCell(page, entity.nameColumnId)).toHaveCount(1);
		});

		test(`B-GRP-05 ${entity.key}: clicking a group row does not open the drawer`, async ({
			authedPage: page,
		}) => {
			await openScopedGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);

			await groupRowFor(page, entity.seed.sampleGroup).click();

			// A negative assertion needs something to settle against, or it samples
			// before a drawer that opens 300 ms later. The expand control is rendered
			// by the same commit that would have opened the drawer, so waiting for it
			// puts the assertion after the click has been handled.
			await expect(
				groupRowFor(page, entity.seed.sampleGroup).getByTestId('expand-row-button'),
			).toBeVisible();
			await expect(page.getByTestId(DRAWER.close)).toHaveCount(0);
			await expectUrlParams(page, { selectedItem: null });
		});

		test(`B-GRP-07 ${entity.key}: a groupBy deep link restores grouping`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.grouped);
			await page.goto(
				listUrl(entity, { groupBy: JSON.stringify([entity.groupByAttribute]) }),
			);
			await waitForRows(page);

			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(1);
			await expect(headerCell(page, entity.nameColumnId)).toHaveCount(0);
		});

		test(`B-GRP-08 ${entity.key}: expanding writes expanded and survives a reload`, async ({
			authedPage: page,
		}) => {
			await openScopedGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);
			await expandGroupRow(page, entity.seed.sampleGroup);

			// Capture *which* row, so the reload assertion below can prove the same one
			// re-expanded rather than merely that something did.
			await expect(async () => {
				expect(expandedFromUrl(page).length).toBeGreaterThan(0);
			}).toPass();
			const expanded = expandedFromUrl(page);

			await page.reload();
			await waitForRows(page);

			// The URL surviving a reload is free — a reload keeps the query string. The
			// load-bearing half is that the *same* row re-expanded, which needs the
			// group row's own expand control to report it.
			expect(expandedFromUrl(page)).toEqual(expanded);
			await expectExpandedRowVisible(page);
			await expect(
				groupRowFor(page, entity.seed.sampleGroup).getByTestId('expand-row-button'),
			).toHaveAttribute('aria-expanded', 'true');
		});

		test(`B-GRP-09 ${entity.key}: the legacy groupBy=[{key}] shape still parses`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.grouped);
			await page.goto(
				listUrl(entity, {
					groupBy: JSON.stringify([{ key: entity.groupByAttribute }]),
				}),
			);
			await waitForRows(page);

			// `groupByFromUrl` normalises `{key: x}` → `x`, so comparing its output to
			// the attribute we just wrote is `x === x`. The load-bearing assertions are
			// the rendered ones: the app parsed the legacy shape and actually grouped.
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(1);
			await expect(headerCell(page, entity.nameColumnId)).toHaveCount(0);
		});
	});
}

// ─── once-level: the grouped status-count cell ───────────────────────────────

test.describe('B-GRP grouped status cells', () => {
	// `once`, where §4.0's default would put this at `representative`. Deliberate:
	// the assertion needs a status-count cell and a fixture whose group holds one
	// pod per phase, and `pods_phases_grouped` is pods-shaped. Of the four
	// representatives, hosts and volumes render no counts cell at all — so the
	// wider fan-out would be two real cases and two vacuous ones.
	const entity = fanOut('once', 'groupBy')[0];

	test('B-GRP-06 grouped rows render one status count per non-zero phase', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, entity);
		await seedDataset(page, 'pods_phases_grouped');
		// Scope to the fixture's namespace: unscoped, other specs' namespaces crowd
		// `ns-mixed` off the first page of group rows.
		await page.goto(
			listUrl(entity, {
				compositeQuery: expressionParam(`${entity.groupByAttribute} = 'ns-mixed'`),
			}),
		);
		await waitForRows(page);
		await groupListBy(page, entity.groupByAttribute);

		const row = groupRowFor(page, 'ns-mixed');
		await expect(row).toBeVisible();

		// One figure per non-zero phase, inside the group row's counts cell. Addressing
		// it by testid matters: "the first cell holding a digit" is the group-name cell
		// for any namespace whose name contains one.
		const cell = row.getByTestId('grouped-status-counts').first();
		await expect(cell).toBeVisible();
		const counts = cell.locator('[data-testid^="status-count-"]').first();
		await expect(counts).toBeVisible();

		// One figure per non-zero phase, and each is addressable by its phase.
		const rendered = await cell
			.locator('[data-testid^="status-count-"]')
			.evaluateAll((nodes) =>
				nodes.map((node) => node.getAttribute('data-testid') ?? ''),
			);
		expect(rendered.length).toBeGreaterThan(0);
		expect(new Set(rendered).size, 'each phase appears once').toBe(
			rendered.length,
		);

		// The **breakdown tooltip is deliberately not asserted.** `TanStackHoverTooltip`
		// mounts its radix trigger only once the row is hovered, so the pointer is
		// already inside when the trigger appears and no enter event reaches it; hover →
		// leave → hover does not open it either, and the content carries no
		// `role="tooltip"` to wait on. That is a keyboard gap as much as a test one, so it
		// is an open bug in the plan's ledger (§12.1, OPEN-3) rather than a red assertion
		// or a silently deleted one.
	});
});
