import {
	BASE_ENTITY,
	EXPANDED_ROW_LIMIT,
	expect,
	groupedCloneNames,
	seedGroupedDataset,
	test,
} from '../../drivers/infra';

// Grouping and the expanded row.
//
// Which rows belong to which group is a backend concern the integration suite
// already covers per entity. What is here is the UI contract: grouping writes
// the param, the group row expands, and the expanded table is capped with a way
// out.

test.describe('infra monitoring — group by', () => {
	test('TC-01 grouping writes the param and renders group rows', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedGroupedDataset(page, BASE_ENTITY);
		expect(facts.rowCount).toBeGreaterThan(0);

		const { groupLabel } = groupedCloneNames(BASE_ENTITY);
		await infra.list.gotoGroupScoped(BASE_ENTITY, groupLabel);
		const table = infra.list.table(BASE_ENTITY);

		await table.groupBy(BASE_ENTITY.groupByAttribute);
		expect(table.groupByFromUrl()).toContain(BASE_ENTITY.groupByAttribute);
		await table.waitForRows();
	});

	test('TC-02 clearing the grouping drops the param', async ({
		authedPage: page,
		infra,
	}) => {
		await seedGroupedDataset(page, BASE_ENTITY);
		const { groupLabel } = groupedCloneNames(BASE_ENTITY);
		await infra.list.gotoGroupScoped(BASE_ENTITY, groupLabel);
		const table = infra.list.table(BASE_ENTITY);

		await table.groupBy(BASE_ENTITY.groupByAttribute);
		await table.clearGrouping();

		expect(table.groupByFromUrl()).toEqual([]);
	});

	test('TC-03 an expanded group is capped and offers View All', async ({
		authedPage: page,
		infra,
	}) => {
		// The clone group holds more members than the expanded table's page size,
		// which is what makes both the cap and the escape hatch observable.
		await seedGroupedDataset(page, BASE_ENTITY);
		const { groupLabel, names } = groupedCloneNames(BASE_ENTITY);
		expect(names.length).toBeGreaterThan(EXPANDED_ROW_LIMIT);

		await infra.list.gotoGroupScoped(BASE_ENTITY, groupLabel);
		const table = infra.list.table(BASE_ENTITY);
		await table.groupBy(BASE_ENTITY.groupByAttribute);
		await table.waitForRows();

		await infra.list.expandGroup(groupLabel);
		await infra.list.expectExpandedVisible();

		// The expanded table pages at `EXPANDED_ROW_LIMIT`, and the way past that
		// cap is View All rather than a second page inside the row.
		await expect(infra.list.expandedRows()).toHaveCount(EXPANDED_ROW_LIMIT);
		await expect(infra.list.viewAllButton()).toBeVisible();

		await infra.list.collapseGroup(groupLabel);
		await expect(infra.list.expandedTable()).toHaveCount(0);
	});
});
