/**
 * B-URL — the URL is the state. Every infra param uses `history: 'push'`, so the
 * back button is a first-class assertion rather than an afterthought.
 *
 * B-URL-03 is the ported `group-view-all.spec.ts` regression, generalised: params
 * written *after* page load must not be resurrected-stale by a later navigation
 * built from `location.search`.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectExpression,
	expectFirstPage,
	expectUrlParams,
} from '../../../helpers/infra-monitoring/assertions';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	drawer,
	expectDrawerVisible,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import {
	entityByKey,
	fanOut,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	ENTITY_NAME_ATTR,
	expressionParam,
	gotoScopedList,
	groupByFromUrl,
	groupListBy,
	headerCell,
	listUrl,
	readExpression,
	renderedRowKeys,
	resetTableState,
	rowFor,
	setPageSize,
	sortStateFromUrl,
	clickSortHeader,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const PODS = entityByKey('pods');

/**
 * The `category` value the URL should carry — absent for hosts (its own route)
 * and for pods (the k8s default, which the app drops rather than writes).
 */
function expectedCategoryParam(entity: EntityDef): string | null {
	if (!entity.categoryTestId || entity.key === 'pods') {
		return null;
	}
	return entity.key;
}

// ─── all-level: one deep link restoring everything ───────────────────────────

for (const entity of fanOut('all')) {
	test.describe(`B-URL ${entity.key} @wide`, () => {
		test(`B-URL-01 ${entity.key}: a fully-specified deep link restores every param`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);

			const orderBy = JSON.stringify({
				columnName: entity.orderByColumnId,
				order: 'desc',
			});
			// Any attribute that exists for the entity; the point is that the
			// expression survives the round trip, not what it selects.
			const expression = `${ENTITY_NAME_ATTR[entity.key]} != 'nothing-matches-this'`;
			const params: Record<string, string> = {
				pageSize: '5',
				orderBy,
				relativeTime: '6h',
				...selectedItemParams(entity),
				compositeQuery: expressionParam(expression),
			};

			await page.goto(listUrl(entity, params));

			// The drawer opens from the deep link, and every param survives the load.
			await expectDrawerVisible(page);
			await expectUrlParams(page, {
				category: expectedCategoryParam(entity),
				pageSize: '5',
				orderBy,
				relativeTime: '6h',
				...selectedItemParams(entity),
			});
			await expectExpression(page, expression);
			expect(sortStateFromUrl(page)).toEqual({
				columnName: entity.orderByColumnId,
				order: 'desc',
			});
			expect(seeded.names.length).toBeGreaterThan(0);
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`B-URL ${entity.key}`, () => {
		test(`B-URL-04 ${entity.key}: params owned by other features survive infra navigation`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);
			await gotoScopedList(page, entity, seeded.names, {
				relativeTime: '6h',
				foreignKey: 'keepme',
			});
			await waitForRows(page);

			// A sort, a page size and a drawer open — none may drop the foreign params.
			await clickSortHeader(page, entity.orderByColumnId);
			await setPageSize(page, 20);
			await waitForRow(page, entity.seed.sampleItemKey);
			await rowFor(page, entity.seed.sampleItemKey).click();

			await expectUrlParams(page, {
				relativeTime: '6h',
				foreignKey: 'keepme',
			});
		});

		test(`B-URL-02 ${entity.key}: each mutation is a history push`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);
			await gotoScopedList(page, entity, seeded.names, { pageSize: '5' });
			await waitForRows(page);

			// Three mutations, then three steps back through the intermediate states.
			await clickSortHeader(page, entity.orderByColumnId);
			const afterSort = sortStateFromUrl(page);
			expect(afterSort).not.toBeNull();

			await setPageSize(page, 20);
			await expectUrlParams(page, { pageSize: '20' });

			await page.goBack();
			await expectUrlParams(page, { pageSize: '5' });
			expect(sortStateFromUrl(page)).toEqual(afterSort);

			await page.goBack();
			await expectUrlParams(page, { orderBy: null });
		});
	});
}

// ─── once-level ──────────────────────────────────────────────────────────────

test.describe('B-URL cross-cutting', () => {
	test('B-URL-03 params written after load are not resurrected-stale by a later navigation', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, PODS.seed.grouped as DatasetKey);

		// Land on another category so the switch to pods happens client-side, the way
		// a user does it — that is what leaves the react-router snapshot stale.
		await page.goto(
			`${PODS.route}?category=namespaces&relativeTime=30m&foreignKey=keepme`,
		);
		await page.getByTestId(PODS.categoryTestId!).click();
		await waitForRows(page);

		// A param written *after* load, via nuqs.
		await groupListBy(page, PODS.groupByAttribute);
		expect(groupByFromUrl(page)).toEqual([PODS.groupByAttribute]);

		// Any subsequent navigation must build on the live URL, not the snapshot:
		// `category` stays dropped (pods is the default the tab click cleared) and
		// the foreign params survive.
		await setPageSize(page, 20);

		await expectUrlParams(page, {
			category: null,
			relativeTime: '30m',
			foreignKey: 'keepme',
			pageSize: '20',
		});
		expect(groupByFromUrl(page)).toEqual([PODS.groupByAttribute]);
		expect(seeded.names.length).toBeGreaterThan(0);
	});

	test('B-URL-05 a ctrl+click URL cold-loads to the same visible state', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, PODS.seed.primary as DatasetKey);
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);

		const [opened] = await Promise.all([
			page.context().waitForEvent('page'),
			rowFor(page, PODS.seed.sampleItemKey).click({
				modifiers: ['ControlOrMeta'],
			}),
		]);
		await opened.waitForLoadState();

		// The new tab cold-loads straight into the drawer for the same pod.
		await expect(drawer(opened)).toBeVisible();
		await expect(drawer(opened)).toContainText(PODS.seed.sampleName);
		expect(new URL(opened.url()).searchParams.get('selectedItem')).toBe(
			PODS.seed.sampleItemKey,
		);
		await opened.close();
	});

	test('B-URL-06 a malformed orderBy deep link is ignored rather than fatal', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, PODS.seed.primary as DatasetKey);

		// `orderBy` is zod-validated, so garbage must not take the page down.
		await page.goto(
			listUrl(PODS, {
				orderBy: '{"columnName":123,"order":"sideways"}',
				compositeQuery: expressionParam(
					`k8s.pod.name IN (${seeded.names.map((n) => `'${n}'`).join(', ')})`,
				),
			}),
		);

		await waitForRows(page);
		await expect(headerCell(page, PODS.nameColumnId)).toBeVisible();
		expect(await renderedRowKeys(page)).not.toEqual([]);
		// The expression the deep link carried is untouched by the bad sort.
		expect(readExpression(page)).toContain(seeded.names[0]);
		await expectFirstPage(page);
	});
});
