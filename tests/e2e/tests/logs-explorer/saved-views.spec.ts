import { expect, serviceFilter, test } from '../../drivers/logs';

test.describe('Logs Explorer — saved views', () => {
	test.afterEach(async ({ views }) => {
		await views.removeByPrefix(views.prefix);
	});

	test('TC-01 the views list shows a seeded view and selecting it loads the view', async ({
		logs,
		logsSeed,
		views,
	}) => {
		const name = views.name('tc01');
		await views.create(name, { expression: serviceFilter(logsSeed.service) });
		await logs.goto();

		await views.search(name);
		await expect(views.row(name)).toBeVisible();
		await views.pick(name);

		await logs.search.expectContains(logsSeed.service);
		await expect(logs.rowByBody(logsSeed.recent[0])).toBeVisible();
	});

	test('TC-02 a view saved from the explorer appears in the views list', async ({
		logs,
		logsSeed,
		views,
	}) => {
		const name = views.name('tc02');
		await logs.gotoUntil(logsSeed.recent[0], {
			expression: serviceFilter(logsSeed.service),
		});
		await logs.search.apply(
			`${serviceFilter(logsSeed.service)} AND e2e.kind = 'even'`,
		);

		await views.saveAs(name);

		expect(await views.names()).toContain(name);
		await views.clear();
		await views.pick(name);
		await logs.search.expectContains("e2e.kind = 'even'");
	});

	test('TC-03 selecting a view in the explorer loads its query', async ({
		logs,
		logsSeed,
		views,
	}) => {
		const odd = views.name('tc03-odd');
		const even = views.name('tc03-even');
		const base = serviceFilter(logsSeed.service);
		await views.create(odd, { expression: `${base} AND e2e.kind = 'odd'` });
		await views.create(even, { expression: `${base} AND e2e.kind = 'even'` });
		await logs.gotoUntil(logsSeed.recent[0], { expression: base });

		await views.pick(odd);
		await logs.search.expectContains("e2e.kind = 'odd'");
		await expect(logs.rowByBody(logsSeed.recent[1])).toBeVisible();
		await expect(logs.rowByBody(logsSeed.recent[0])).toHaveCount(0);

		await views.pick(even);
		await logs.search.expectContains("e2e.kind = 'even'");
		await expect(logs.rowByBody(logsSeed.recent[0])).toBeVisible();
		await expect(logs.rowByBody(logsSeed.recent[1])).toHaveCount(0);
	});

	test('TC-04 renaming a view in the views list persists after a reload', async ({
		logs,
		logsSeed,
		views,
	}) => {
		const name = views.name('tc04');
		const renamed = `${name}-renamed`;
		await views.create(name, { expression: serviceFilter(logsSeed.service) });
		await logs.goto();
		await views.search(name);

		await views.rename(name, renamed);

		await logs.goto();
		await views.search(name);
		await expect(views.row(renamed)).toBeVisible();
		await expect(views.row(name)).toHaveCount(0);
		const names = await views.names();
		expect(names).toContain(renamed);
		expect(names).not.toContain(name);
	});

	test('TC-05 deleting a view removes it from the views list', async ({
		logs,
		logsSeed,
		views,
	}) => {
		const name = views.name('tc05');
		await views.create(name, { expression: serviceFilter(logsSeed.service) });
		await logs.goto();
		await views.search(name);

		await views.remove(name);

		expect(await views.names()).not.toContain(name);
		await logs.goto();
		await views.search(name);
		await expect(views.row(name)).toHaveCount(0);
	});
});
