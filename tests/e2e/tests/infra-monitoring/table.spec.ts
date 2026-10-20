import { BASE_ENTITY, expect, seedDataset, test } from '../../drivers/infra';

// The list table: what a real response does to it, and what the user can do to
// it that persists.
//
// Ordering and pagination *correctness* are not here. `test_<entity>_orderby`
// and `test_<entity>_pagination` in `tests/integration/tests/inframonitoring/`
// already assert, per entity and headless, that the API returns the right rows
// in the right order for every column and direction. What a browser adds is that
// the click writes the param and the response reaches the table.

test.describe('infra monitoring — table', () => {
	test('TC-01 sorting writes orderBy and re-renders from the response', async ({
		authedPage: page,
		infra,
	}) => {
		await infra.list.resetState(BASE_ENTITY);
		const facts = await seedDataset(page, BASE_ENTITY.orderByDataset);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		const ascending = await table.rowKeys();
		await table.sortBy(BASE_ENTITY.orderByColumnId);

		const sorted = table.sortState();
		expect(sorted?.columnName).toBe(BASE_ENTITY.orderByColumnId);
		await expect(async () => {
			expect(await table.rowKeys()).not.toEqual(ascending);
		}).toPass();
	});

	test('TC-02 paging moves through the seeded rows', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.pagination);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names, { pageSize: '5' });
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		const pageOne = await table.rowKeys();
		expect(pageOne.length).toBeGreaterThan(0);

		await table.gotoPage(2);
		await table.waitForRows();

		const pageTwo = await table.rowKeys();
		expect(pageTwo).not.toEqual(pageOne);
		// No row appears twice across the two pages.
		expect(new Set([...pageOne, ...pageTwo]).size).toBe(
			pageOne.length + pageTwo.length,
		);
	});

	test('TC-03 a page size change reaches the URL and the table', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.pagination);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		await table.pageSize(10);
		await table.waitForRows();

		expect((await table.rowKeys()).length).toBeLessThanOrEqual(10);
	});

	test('TC-04 hiding a column persists across a reload', async ({
		authedPage: page,
		infra,
	}) => {
		await infra.list.resetState(BASE_ENTITY);
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		const before = await table.headers();
		expect(before.length).toBeGreaterThan(1);

		// The store is what persistence hangs on, and `useColumnStore`'s own
		// behaviour is covered in jest — what a browser adds is that the table
		// reads it back on a cold load.
		await table.setColumnState({
			hiddenColumnIds: [BASE_ENTITY.orderByColumnId],
		});
		await page.reload();
		await table.waitForRows();

		expect(await table.headers()).not.toEqual(before);
		expect((await table.columnState()).hiddenColumnIds).toEqual([
			BASE_ENTITY.orderByColumnId,
		]);
	});

	test('TC-05 a resize survives a reload', async ({
		authedPage: page,
		infra,
	}) => {
		await infra.list.resetState(BASE_ENTITY);
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		const widened = await table.resizeColumn(BASE_ENTITY.nameColumnId, 120);

		await page.reload();
		await table.waitForRows();

		const restored = (await table.columnState()).columnSizing ?? {};
		expect(Object.keys(restored).length).toBeGreaterThan(0);
		expect(
			await table.headerCell(BASE_ENTITY.nameColumnId).boundingBox(),
		).toMatchObject({ width: expect.closeTo(widened, -1) });
	});

	test('TC-06 a malformed persisted column state does not break the table', async ({
		authedPage: page,
		infra,
	}) => {
		await infra.list.resetState(BASE_ENTITY);
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		// A value persisted under an older schema. The store fills the gaps rather
		// than handing `undefined` to its selectors.
		await table.setRawColumnState('{"hiddenColumnIds":"nope"}');
		await page.reload();

		await table.waitForRows();
		expect((await table.headers()).length).toBeGreaterThan(1);
	});
});
