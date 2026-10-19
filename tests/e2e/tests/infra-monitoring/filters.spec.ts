import { BASE_ENTITY, expect, seedDataset, test } from '../../drivers/infra';

// The expression editor over the list.
//
// Filter *semantics* — what an expression selects, what an invalid one returns,
// how an attribute narrows the set — are asserted per entity and headless by
// `test_<entity>_filter` and `test_<entity>_filter_invalid` in the integration
// suite. What a browser adds is that the editor produces the expression, the
// Run button sends it, and the response reaches the table.

test.describe('infra monitoring — filters', () => {
	test('TC-01 an applied expression narrows the table and reaches the URL', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.filter);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		const [first] = facts.names;
		await infra.list.search.apply(`${BASE_ENTITY.nameColumnId} = '${first}'`);
		await table.waitForRows();

		// Asserted by name: this fixture's pod UIDs do not follow `<name>-uid`.
		await expect(table.rows()).toHaveCount(1);
		await expect(table.rows().first()).toContainText(first);
		expect(infra.list.search.read()).toBe(
			`${BASE_ENTITY.nameColumnId} = '${first}'`,
		);
	});

	test('TC-02 clearing the expression restores the full list', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.filter);
		await infra.list.goto(BASE_ENTITY);
		const table = infra.list.table(BASE_ENTITY);

		const [first] = facts.names;
		await infra.list.search.apply(`${BASE_ENTITY.nameColumnId} = '${first}'`);
		await table.waitForRows();
		expect(await table.rowKeys()).toHaveLength(1);

		await infra.list.search.apply('');
		await table.waitForRows();

		expect((await table.rowKeys()).length).toBeGreaterThan(1);
	});

	test('TC-03 an expression that matches nothing shows the no-results state', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(BASE_ENTITY);

		await infra.list.search.apply(
			`${BASE_ENTITY.nameColumnId} = 'no-such-row-anywhere'`,
		);

		await expect(infra.list.noResults()).toBeVisible();
	});

	test('TC-04 an in-flight query can be cancelled', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(BASE_ENTITY);

		// Delay the real request rather than faking it: `route.continue()` still
		// reaches the backend, so only the timing changes.
		await page.route(
			(url) => infra.list.isListRequest(url.toString()),
			async (route) => {
				await new Promise((resolve) => {
					setTimeout(resolve, 3_000);
				});
				await route.continue();
			},
		);

		await infra.list.search.editor().click();
		await page.keyboard.type(`${BASE_ENTITY.nameColumnId} = 'anything'`);
		await page.keyboard.press('Escape');
		await infra.list.search.run();

		await expect(infra.list.search.cancelButton()).toBeVisible();
		await infra.list.search.cancelButton().click();

		await page.unrouteAll({ behavior: 'ignoreErrors' });
		await expect(infra.list.search.cancelButton()).toHaveCount(0);
		await expect(infra.list.search.runButton()).toBeVisible();
	});

	test('TC-05 a deep-linked expression is honoured on the first load', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.filter);
		const [first] = facts.names;

		await infra.list.gotoScoped(BASE_ENTITY, [first]);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		await expect(table.rows()).toHaveCount(1);
		await expect(table.rows().first()).toContainText(first);
	});
});
