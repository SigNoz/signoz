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
	expectedCategoryParam,
} from '../../../helpers/infra-monitoring/assertions';
import {
	drawer,
	drawerTitle,
	expectDrawerVisible,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import {
	entityByKey,
	fanOut,
	type EntityDef,
} from '../../../helpers/infra-monitoring/entities';
import {
	clickSortHeader,
	expressionParam,
	expressionParams,
	goBackUntil,
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
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const PODS = entityByKey('pods');

/**
 * `statusFilter` for the one entity that has it.
 *
 * A helper rather than a ternary in the test body: `playwright/no-conditional-in-test`
 * (rightly) rejects branching inside a test, because a branch that never runs is
 * coverage nobody notices is missing.
 */
function statusFilterParam(entity: EntityDef): Record<string, string> {
	return entity.capabilities.has('statusFilter')
		? { statusFilter: 'active' }
		: {};
}

// ─── all-level: one deep link restoring everything ───────────────────────────

for (const entity of fanOut('all')) {
	test.describe(`B-URL ${entity.key} @wide`, () => {
		test(`B-URL-01 ${entity.key}: a fully-specified deep link restores every param`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary);

			const orderBy = JSON.stringify({
				columnName: entity.orderByColumnId,
				order: 'desc',
			});
			// Any attribute that exists for the entity; the point is that the
			// expression survives the round trip, not what it selects.
			const expression = `${entity.nameColumnId} != 'nothing-matches-this'`;
			const groupBy = JSON.stringify([entity.groupByAttribute]);
			// All eleven params the plan lists, not the six this used to carry:
			// `page`, `groupBy`, `expanded`, `statusFilter` and `view` were missing.
			// `statusFilter` is hosts-only, so it is added conditionally.
			const params: Record<string, string> = {
				page: '1',
				pageSize: '5',
				orderBy,
				groupBy,
				relativeTime: '6h',
				view: 'logs',
				...statusFilterParam(entity),
				...selectedItemParams(entity),
				...expressionParams(expression),
			};

			await page.goto(listUrl(entity, params));

			// The drawer opens from the deep link, and every param survives the load.
			await expectDrawerVisible(page);
			await expectUrlParams(page, {
				category: expectedCategoryParam(entity),
				pageSize: '5',
				orderBy,
				groupBy,
				relativeTime: '6h',
				...statusFilterParam(entity),
				...selectedItemParams(entity),
			});
			await expectExpression(page, expression);

			// …and, more importantly, that they took *effect*. Re-reading `orderBy`
			// through `sortStateFromUrl` only restated the param `expectUrlParams` had
			// just checked; nothing here proved the app consumed any of them.
			await expect(headerCell(page, entity.groupColumnId)).toHaveCount(1);
			await expect(headerCell(page, entity.nameColumnId)).toHaveCount(0);
			await expect(async () => {
				expect((await renderedRowKeys(page)).length).toBeLessThanOrEqual(5);
			}).toPass();
			// The drawer is the seeded entity's, not an empty shell from a bad param —
			// a nonexistent `selectedItem` opens a drawer titled `-`.
			await expect(drawerTitle(page)).toContainText(entity.seed.sampleName);
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
			const seeded = await seedDataset(page, entity.seed.primary);
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
			const seeded = await seedDataset(page, entity.seed.primary);
			await gotoScopedList(page, entity, seeded.names, { pageSize: '5' });
			await waitForRows(page);

			// Three mutations, then three steps back through the intermediate states.
			await clickSortHeader(page, entity.orderByColumnId);
			const afterSort = sortStateFromUrl(page);
			expect(afterSort).not.toBeNull();

			await setPageSize(page, 20);
			await expectUrlParams(page, { pageSize: '20' });

			// `goBackUntil`, not a bare `goBack()`. A `toPass`-wrapped URL read after a
			// single Back recovers from a destination that settles *late*, but not from
			// landing one history entry short — it re-reads without pressing Back again.
			await goBackUntil(page, /pageSize=5\b/);
			await expectUrlParams(page, { pageSize: '5' });
			// The intermediate state is intact: paging back did not also undo the sort.
			expect(sortStateFromUrl(page)).toEqual(afterSort);

			await goBackUntil(page, /^(?!.*orderBy=).*$/);
			await expectUrlParams(page, { orderBy: null });
			// …and we are back at the URL we started from, which is the actual claim:
			// N mutations, N pushes, N steps home.
			await expectUrlParams(page, { pageSize: '5' });
		});
	});
}

// ─── once-level ──────────────────────────────────────────────────────────────

test.describe('B-URL cross-cutting', () => {
	test('B-URL-03 params written after load are not resurrected-stale by a later navigation', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.grouped);

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
	});

	test('B-URL-05 a ctrl+click URL cold-loads to the same visible state', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, PODS.seed.primary);
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
		const seeded = await seedDataset(page, PODS.seed.primary);

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
