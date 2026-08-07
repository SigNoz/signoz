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
import {
	entityByKey,
	K8S_CATEGORY_TAB_ORDER,
	K8S_ENTITIES,
	K8S_PATH,
} from '../../../helpers/infra-monitoring/entities';
import {
	allowForSeededWait,
	applyExpression,
	clickSortHeader,
	expectCategoryActive,
	goBackUntil,
	gotoList,
	groupListBy,
	listUrl,
	quickFilterSections,
	quickFiltersToggle,
	resetTableState,
	scopedListUrl,
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
		await seedDataset(page, PODS.seed.primary);
		await page.goto(K8S_PATH);
		await waitForRows(page);

		// pods is the default, and the app drops the param rather than writing it.
		await expectUrlParams(page, { category: null });
		// "pods **active**", which `toBeVisible` cannot say — the rail renders all
		// nine buttons on every category. The pressed state is the evidence.
		await expectCategoryActive(page, PODS);
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
		allowForSeededWait();
		const nodes = entityByKey('nodes');
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.grouped);
		await seedDataset(page, PODS.seed.primary);
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
		await expectExpression(page, '');
		// The `page` half of this scenario is B-NAV-04b — it is a live product bug,
		// so it is parked separately rather than taking the other three claims red.
	});

	/**
	 * **Parked: this is a live product bug.** A category switch does not reset the
	 * page, so switching while on page 3 lands on page 3 of the new entity — which,
	 * if that entity has fewer rows, is the dead end B-LIST-18 describes.
	 *
	 * `handleCategorySelect` (`InfraMonitoringK8s.tsx:216-236`) clears `orderBy`,
	 * `groupBy`, `selectedItem*` and the expression, and never touches `page`. The
	 * three writers that do reset it — `K8sTableToolbar` (group-by),
	 * `K8sExpandedRow` (View All) and `K8sHeader` (Run) — do not include the rail.
	 * Nor does an unmount save it: `K8sDynamicList` renders `<K8sBaseList>` unkeyed,
	 * so a switch re-renders the same instance and `useTableParams`'
	 * `cleanupOnUnmount` never fires.
	 *
	 * §4's B-NAV-04 has always claimed this reset. It read as covered because the
	 * scenario never left page one and `expectFirstPage` accepts absent-or-`'1'`.
	 *
	 * Driven from a **deep link** rather than a click, because that is the reported
	 * repro (refresh on `page=3`, then switch) and it also exercises the URL-seeded
	 * path through `useTableParams` that a click does not.
	 */
	test.fixme('B-NAV-04b a category switch resets the page, including from a deep link', async ({
		authedPage: page,
	}) => {
		const nodes = entityByKey('nodes');
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, PODS.seed.pagination);
		await page.goto(
			scopedListUrl(PODS, seeded.names, { page: '3', pageSize: '5' }),
		);
		await waitForRows(page);
		await expectUrlParams(page, { page: '3' });

		await switchCategory(page, nodes);

		await expectFirstPage(page);
	});

	test('B-NAV-10 a category switch from a drawer deep link clears selectedItem*', async ({
		authedPage: page,
	}) => {
		const nodes = entityByKey('nodes');
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.primary);
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

		// `goBackUntil`, not a bare `goBack()`. A destination that rewrites its own
		// URL on arrival pushes a second history entry, so one Back lands on the
		// destination's *first* URL rather than on the previous category — and a
		// `toPass`-wrapped URL read never presses Back again, it just re-reads.
		await goBackUntil(page, /category=clusters\b/);
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

		// `watch.errors` / `watch.failedResponses` are plain arrays that fill
		// asynchronously, and `toHaveCount(0)` above is satisfied instantly (zero is
		// the initial state) — so reading them here sampled while the shell's requests
		// were still in flight. Wait for the network to go quiet first.
		await page.waitForLoadState('networkidle');
		expect(watch.errors, 'console errors').toEqual([]);
		expect(watch.failedResponses, 'failed requests').toEqual([]);
	});

	test('B-NAV-08 the quick-filter rail collapses and reopens', async ({
		authedPage: page,
	}) => {
		// Seed first so the table is guaranteed present and its width measurable —
		// otherwise the widening assertion would need a runtime guard.
		await resetTableState(page, PODS);
		await seedDataset(page, PODS.seed.primary);
		await page.goto(K8S_PATH);
		await waitForRows(page);
		await expect(quickFilterSections(page).first()).toBeVisible();

		// The `table` element's own width is driven by its columns' sizes, not by the
		// space available, so it is *unchanged* by collapsing the rail — measure the
		// scroll container, which is what actually reclaims the rail's width.
		const scroller = page.locator('[class*="tableContainer"]').first();
		const widthWithRail = await scroller.evaluate(
			(el) => el.getBoundingClientRect().width,
		);

		await quickFiltersToggle(page).click();
		await expect(quickFilterSections(page)).toHaveCount(0);
		await expect(async () => {
			const collapsed = await scroller.evaluate(
				(el) => el.getBoundingClientRect().width,
			);
			expect(collapsed).toBeGreaterThan(widthWithRail);
		}).toPass();

		// Re-opening restores the rail within the same page …
		await quickFiltersToggle(page).click();
		await expect(quickFilterSections(page).first()).toBeVisible();

		// … and because the collapse is component-local state rather than a param or
		// a storage key, a reload comes back with the rail open. The comment used to
		// claim this without a reload to back it up.
		await quickFiltersToggle(page).click();
		await expect(quickFilterSections(page)).toHaveCount(0);
		await page.reload();
		await waitForRows(page);
		await expect(quickFilterSections(page).first()).toBeVisible();
	});
});

// ─── all nine k8s entities: the switch and the reload ────────────────────────

for (const entity of K8S_ENTITIES) {
	test.describe(`B-NAV ${entity.key} @wide`, () => {
		test(`B-NAV-02 ${entity.key}: clicking its tab applies its columns and quick filters`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary);
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
			await seedDataset(page, entity.seed.primary);
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
