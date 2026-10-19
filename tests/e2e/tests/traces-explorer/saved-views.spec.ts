import { expect, test } from '../../drivers/traces-explorer';

test.describe('Traces explorer, saved views', () => {
	test('TC-01 a view saved from the explorer appears on the saved-views page', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		const name = `${seed.stamp}-tbl`;
		await traces.goto();
		await traces.filterService(seed.service);
		await traces.switchView('table');
		await traces.views.saveAs(name);

		await expect(traces.toast('View Saved Successfully')).toBeVisible();
		expect(traces.urlParam('viewKey')).toBeTruthy();

		await traces.views.gotoPage();
		await traces.views.search(name);
		await expect(traces.views.row(name)).toBeVisible();
	});

	test('TC-02 opening a saved view restores its query and panel', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		const name = `${seed.stamp}-open`;
		await traces.views.create(name, {
			expression: `service.name = '${seed.service}'`,
			panelType: 'trace',
		});

		await traces.views.gotoPage();
		await traces.views.search(name);
		await traces.views.open(name);

		await expect(async () => {
			expect(traces.panelType()).toBe('trace');
		}).toPass();
		await traces.search.expectContains(seed.service);
		await traces.waitForRow(seed.traceId);
	});

	test('TC-03 updating a loaded view persists the new query', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		const name = `${seed.stamp}-upd`;
		const next = `service.name = '${seed.service}' AND name = 'GET /orders'`;
		await traces.views.create(name, {
			expression: `service.name = '${seed.service}'`,
		});

		await traces.goto();
		await traces.views.pick(name);
		await traces.search.apply(next);
		await traces.views.update();

		await expect(traces.toast('View Updated Successfully')).toBeVisible();
		const stored = (await traces.views.list()).find((view) => view.name === name);
		expect(JSON.stringify(stored?.compositeQuery)).toContain(
			"name = 'GET /orders'",
		);

		await traces.reload();
		await traces.search.expectContains("name = 'GET /orders'");
	});

	test('TC-04 rename and delete round-trip through the API', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		const before = `${seed.stamp}-ren-a`;
		const after = `${seed.stamp}-ren-b`;
		await traces.views.create(before, {
			expression: `service.name = '${seed.service}'`,
		});

		await traces.views.gotoPage();
		await traces.views.search(seed.stamp);
		await traces.views.rename(before, after);

		await traces.views.gotoPage();
		await traces.views.search(seed.stamp);
		await expect(traces.views.row(after)).toBeVisible();
		await expect(traces.views.row(before)).toHaveCount(0);

		await traces.views.open(after);
		await traces.search.expectContains(seed.service);

		await traces.views.gotoPage();
		await traces.views.search(after);
		await traces.views.remove(after);

		await traces.views.gotoPage();
		await traces.views.search(after);
		await expect(traces.views.row(after)).toHaveCount(0);
	});

	test('TC-05 clearing a loaded view resets the explorer', async ({
		traces,
		tracesExplorerSeed: seed,
	}) => {
		const name = `${seed.stamp}-clr`;
		await traces.views.create(name, {
			expression: `service.name = '${seed.service}'`,
			panelType: 'table',
		});

		await traces.goto();
		await traces.views.pick(name);
		await traces.views.clear();

		expect(traces.urlParam('viewKey')).toBeNull();
		await expect(traces.viewButton('list')).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await traces.search.expectExpression('');
	});
});
