import {
	BASE_ENTITY,
	DEFAULT_CATEGORY,
	entityByKey,
	expect,
	K8S_CATEGORY_TAB_ORDER,
	seedDataset,
	test,
} from '../../drivers/infra';

// The kubernetes route's left rail: category switching and what it does to the
// URL. Hosts lives on its own route with no rail.
//
// These run on pods and nodes only. `K8sBaseList` does not branch on entity —
// the only thing that varies is the config object it is handed — so running the
// same navigation nine more times proves nothing the source does not already
// say. The per-entity config is asserted in jest.

const NODES = entityByKey('nodes');

test.describe('infra monitoring — navigation', () => {
	test('TC-01 a fresh kubernetes route lands on containers with no category param', async ({
		authedPage: page,
		infra,
	}) => {
		await infra.list.load();

		// "containers active", which `toBeVisible` cannot say: the rail renders
		// every button on every category, so the selected class is the evidence.
		await infra.list.expectCategoryActive(DEFAULT_CATEGORY);
		expect(new URL(page.url()).searchParams.get('category')).toBeNull();
	});

	test(`TC-02 the rail renders ${K8S_CATEGORY_TAB_ORDER.length} categories in order`, async ({
		infra,
	}) => {
		await infra.list.load();

		// The rail mounts a tab at a time, so counting first catches a partial list.
		const tabs = infra.list.categoryTabs();
		await expect(tabs).toHaveCount(K8S_CATEGORY_TAB_ORDER.length);

		expect(
			await tabs.evaluateAll((buttons) =>
				buttons.map(
					(button) =>
						button.getAttribute('data-testid')?.replace('category-', '') ?? '',
				),
			),
		).toEqual(K8S_CATEGORY_TAB_ORDER);
	});

	test('TC-03 switching to the default category writes its param', async ({
		authedPage: page,
		infra,
	}) => {
		await infra.list.load(NODES);
		await expect(page).toHaveURL(/category=nodes/);

		await infra.list.switchCategory(DEFAULT_CATEGORY);
	});

	test('TC-04 a category switch clears orderBy, groupBy and the expression', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		await table.sortBy(BASE_ENTITY.orderByColumnId);
		await table.groupBy(BASE_ENTITY.groupByAttribute);

		await infra.list.switchCategory(NODES);

		await expect(page).not.toHaveURL(/orderBy=|groupBy=/);
		await infra.list.search.expectExpression('');
	});

	test('TC-05 a deep-linked category and filter survive a reload', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, NODES.seed.primary);
		await infra.list.gotoScoped(NODES, facts.names);
		await infra.list.table(NODES).waitForRows();
		const before = new URL(page.url()).searchParams;

		await page.reload();
		await infra.list.table(NODES).waitForRows();

		const after = new URL(page.url()).searchParams;
		for (const [key, value] of before) {
			expect(after.get(key), `param ${key} survived the reload`).toBe(value);
		}
		await infra.list.expectCategoryActive(NODES);
	});

	test('TC-06 the quick-filter rail collapses and restores', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(BASE_ENTITY);

		const sections = infra.list.quickFilterSections();
		await expect(sections.first()).toBeVisible();

		await infra.list.quickFiltersToggle().first().click();
		await expect(sections).toHaveCount(0);

		await infra.list.quickFiltersToggle().first().click();
		await expect(sections.first()).toBeVisible();
	});
});
