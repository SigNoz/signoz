/**
 * B-NAV — the kubernetes route's left rail: category switching, param defaults,
 * and the quick-filter collapse.
 *
 * Hosts lives on its own route with no rail, so this file is k8s-only; the hosts
 * side of navigation is H-01 in `tests/infra-monitoring/hosts/`.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectDefaultColumns,
	expectExpression,
	expectFirstPage,
	expectQuickFilterSections,
	expectUrlParams,
} from '../../../helpers/infra-monitoring/assertions';
import type { DatasetKey } from '../../../helpers/infra-monitoring/datasets';
import {
	entityByKey,
	K8S_CATEGORY_TAB_ORDER,
	K8S_ENTITIES,
	K8S_PATH,
} from '../../../helpers/infra-monitoring/entities';
import {
	applyExpression,
	gotoList,
	groupListBy,
	listUrl,
	quickFilterRail,
	quickFiltersToggle,
	resetTableState,
	clickSortHeader,
	switchCategory,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import {
	drawer,
	expectDrawerVisible,
} from '../../../helpers/infra-monitoring/drawer';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';
import { watchConsole } from '../../../helpers/common';

const PODS = entityByKey('pods');

test.describe('B-NAV', () => {
	test('B-NAV-01 a fresh kubernetes route lands on pods with no category param', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.primary as DatasetKey);
		await page.goto(K8S_PATH);
		await waitForRows(page);

		// pods is the default, and the app drops the param rather than writing it.
		await expectUrlParams(page, { category: null });
		await expect(page.getByTestId(PODS.categoryTestId!)).toBeVisible();
		await expectDefaultColumns(page, PODS);
	});

	test(`B-NAV-09 the rail order is ${K8S_CATEGORY_TAB_ORDER.join(' · ')}`, async ({
		authedPage: page,
	}) => {
		await page.goto(K8S_PATH);

		// The rail mounts a tab at a time, so reading it once catches a partial list.
		const tabs = page.locator('[data-testid^="category-"]');
		await expect(tabs).toHaveCount(K8S_CATEGORY_TAB_ORDER.length);

		const rendered = await tabs.evaluateAll((buttons) =>
			buttons.map(
				(button) =>
					button.getAttribute('data-testid')?.replace('category-', '') ?? '',
			),
		);
		expect(rendered).toEqual(K8S_CATEGORY_TAB_ORDER);
	});

	test('B-NAV-03 clicking back to pods removes the param rather than writing category=pods', async ({
		authedPage: page,
	}) => {
		await page.goto(listUrl(entityByKey('nodes')));
		await expectUrlParams(page, { category: 'nodes' });

		await switchCategory(page, PODS);
		await expectUrlParams(page, { category: null });
	});

	test('B-NAV-04 a category switch clears orderBy, groupBy, selectedItem* and the expression, and resets page', async ({
		authedPage: page,
	}) => {
		// Five settle-and-navigate steps in one scenario (filter, drawer, sort, group,
		// switch). That is the point of the test, and it does not fit the default
		// timeout once six workers are sharing the stack.
		test.slow();
		const nodes = entityByKey('nodes');
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.grouped as DatasetKey);
		await seedDataset(page, PODS.seed.primary as DatasetKey);
		await gotoList(page, PODS);
		await waitForRows(page);

		// The drawer is a modal: its overlay covers the category rail, so a tab simply
		// cannot be clicked while it is open (Playwright reports the overlay
		// intercepting pointer events until the timeout). So the click-driven half of
		// this scenario covers the list-level params, and the `selectedItem*` half runs
		// from a deep link — which is the only way a user reaches a category switch
		// with a drawer identity in the URL anyway.
		await applyExpression(page, `k8s.pod.name = '${PODS.seed.sampleName}'`);
		await waitForRow(page, PODS.seed.sampleItemKey);
		await clickSortHeader(page, PODS.orderByColumnId);
		await groupListBy(page, PODS.groupByAttribute);

		await switchCategory(page, nodes);

		await expectUrlParams(page, { orderBy: null, groupBy: null });
		await expectFirstPage(page);
		await expectExpression(page, '');
	});

	test('B-NAV-10 a category switch from a drawer deep link clears selectedItem*', async ({
		authedPage: page,
	}) => {
		const nodes = entityByKey('nodes');
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.primary as DatasetKey);
		await page.goto(
			listUrl(PODS, {
				selectedItem: PODS.seed.sampleItemKey,
				relativeTime: '30m',
			}),
		);
		await expectDrawerVisible(page);

		// The rail is unreachable behind the drawer's overlay — that is the modal's
		// contract, and it is asserted rather than worked around.
		await expect(page.locator('[data-slot="drawer-overlay"]')).toBeVisible();

		// Closing it first is what a user does; the switch then clears the identity.
		await page.keyboard.press('Escape');
		await expect(drawer(page)).toHaveCount(0);
		await switchCategory(page, nodes);

		await expectUrlParams(page, {
			selectedItem: null,
			selectedItemClusterName: null,
			selectedItemNamespaceName: null,
		});
	});

	test('B-NAV-06 back after a category switch returns to the previous category', async ({
		authedPage: page,
	}) => {
		const clusters = entityByKey('clusters');
		await page.goto(listUrl(clusters));
		await expectUrlParams(page, { category: 'clusters' });

		await switchCategory(page, entityByKey('volumes'));
		await expectUrlParams(page, { category: 'volumes' });

		await page.goBack();
		await expectUrlParams(page, { category: 'clusters' });
	});

	test('B-NAV-07 an unknown category renders nothing but keeps the shell intact', async ({
		authedPage: page,
	}) => {
		const watch = watchConsole(page);
		await page.goto(`${K8S_PATH}?category=bogus`);

		// The rail is still there; `K8sDynamicList` simply has no config to render.
		await expect(page.getByTestId(PODS.categoryTestId!)).toBeVisible();
		await expect(page.locator('table')).toHaveCount(0);

		expect(watch.errors, 'console errors').toEqual([]);
		expect(watch.failedResponses, 'failed requests').toEqual([]);
	});

	test('B-NAV-08 the quick-filter rail collapses and reopens', async ({
		authedPage: page,
	}) => {
		// Seed first so the table is guaranteed present and its width measurable —
		// otherwise the widening assertion would need a runtime guard.
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.primary as DatasetKey);
		await page.goto(K8S_PATH);
		await waitForRows(page);
		await expect(quickFilterRail(page).first()).toBeVisible();

		// The `table` element's own width is driven by its columns' sizes, not by the
		// space available, so it is *unchanged* by collapsing the rail — measure the
		// scroll container, which is what actually reclaims the rail's width.
		const scroller = page.locator('[class*="tableContainer"]').first();
		const widthWithRail = await scroller.evaluate(
			(el) => el.getBoundingClientRect().width,
		);

		await quickFiltersToggle(page).click();
		await expect(quickFilterRail(page)).toHaveCount(0);
		await expect(async () => {
			const collapsed = await scroller.evaluate(
				(el) => el.getBoundingClientRect().width,
			);
			expect(collapsed).toBeGreaterThan(widthWithRail);
		}).toPass();

		// The collapse is component-local state, so it does not survive a reload —
		// re-opening restores the rail within the same page.
		await quickFiltersToggle(page).click();
		await expect(quickFilterRail(page).first()).toBeVisible();
	});
});

// ─── all nine k8s entities: the switch and the reload ────────────────────────

for (const entity of K8S_ENTITIES) {
	test.describe(`B-NAV ${entity.key} @wide`, () => {
		test(`B-NAV-02 ${entity.key}: clicking its tab applies its columns and quick filters`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary as DatasetKey);
			await page.goto(K8S_PATH);
			await waitForRows(page);

			await switchCategory(page, entity);
			await waitForRows(page);

			await expectDefaultColumns(page, entity);
			await expectQuickFilterSections(page, entity);
		});

		test(`B-NAV-05 ${entity.key}: reloading ?category=${entity.key} restores the tab`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary as DatasetKey);
			await page.goto(listUrl(entity));
			await waitForRows(page);

			await page.reload();
			await waitForRows(page);

			await expectUrlParams(page, {
				category: entity.key === 'pods' ? null : entity.key,
			});
			await expectDefaultColumns(page, entity);
		});
	});
}
