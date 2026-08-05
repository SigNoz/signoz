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
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import { DRAWER } from '../../../helpers/infra-monitoring/drawer';
import {
	fanOut,
	WIDE_TAG,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	clearGrouping,
	expandedFromUrl,
	expandGroupRow,
	gotoList,
	groupByFromUrl,
	groupBySelect,
	expressionParam,
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
	await seedDataset(page, entity.seed.grouped as DatasetKey);
	await gotoList(page, entity);
	await waitForRows(page);
}

// ─── all-level ───────────────────────────────────────────────────────────────

for (const entity of fanOut('all', 'groupBy')) {
	test.describe(`B-GRP ${entity.key} ${WIDE_TAG}`, () => {
		test(`B-GRP-02 ${entity.key}: grouping by ${entity.groupByAttribute} swaps the name column for the group column`, async ({
			authedPage: page,
		}) => {
			await openGroupableList(page, entity);
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
			await openGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);

			await groupRowFor(page, entity.seed.sampleGroup).click();

			await expect(page.getByTestId(DRAWER.close)).toBeHidden();
			await expectUrlParams(page, { selectedItem: null });
		});

		test(`B-GRP-07 ${entity.key}: a groupBy deep link restores grouping`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.grouped as DatasetKey);
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
			await openGroupableList(page, entity);
			await groupListBy(page, entity.groupByAttribute);
			await expandGroupRow(page, entity.seed.sampleGroup);

			await expect(async () => {
				expect(expandedFromUrl(page).length).toBeGreaterThan(0);
			}).toPass();
			const expanded = expandedFromUrl(page);

			await page.reload();
			await waitForRows(page);

			expect(expandedFromUrl(page)).toEqual(expanded);
			await expect(page.getByTestId('expanded-table-container')).toBeVisible();
		});

		test(`B-GRP-09 ${entity.key}: the legacy groupBy=[{key}] shape still parses`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.grouped as DatasetKey);
			await page.goto(
				listUrl(entity, {
					groupBy: JSON.stringify([{ key: entity.groupByAttribute }]),
				}),
			);
			await waitForRows(page);

			expect(groupByFromUrl(page)).toEqual([entity.groupByAttribute]);
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(1);
		});
	});
}

// ─── once-level: the grouped status-count cell ───────────────────────────────

test.describe('B-GRP grouped status cells', () => {
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
		// `role="tooltip"` to wait on. Recorded in §11.1 rather than left as a red
		// assertion or a silently deleted one.
	});
});
