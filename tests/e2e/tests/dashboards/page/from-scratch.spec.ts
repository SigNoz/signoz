import {
	expect,
	GOLDEN,
	PanelKind,
	PATH,
	test,
} from '../../../drivers/dashboard-list';

// Scope: a dashboard built entirely through the UI — the list page's Blank
// create flow, its first panel, and deletion from the list.

function uniqueName(label: string): string {
	return `e2e ${label} ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

test.describe('Dashboards — dashboard from scratch', () => {
	test('TC-01 a blank dashboard is created from the list page', async ({
		authedPage: page,
		dashboardList,
		dashboards,
	}) => {
		const name = uniqueName('blank');
		await dashboardList.open();

		const id = await dashboardList.create({
			name,
			description: 'Built through the UI',
			tags: ['team:e2e', 'env:test'],
		});

		await expect(page).toHaveURL(PATH.onDashboard(id));
		await expect(dashboards.title()).toHaveText(name);
		await expect(dashboards.emptyAddPanel()).toBeVisible();

		const saved = await dashboards.get(id);
		expect(saved.spec.display.name).toBe(name);
		expect(saved.spec.display.description).toBe('Built through the UI');
		expect(saved.tags).toEqual(
			expect.arrayContaining([
				{ key: 'team', value: 'e2e' },
				{ key: 'env', value: 'test' },
			]),
		);
		expect(saved.tags).toHaveLength(2);
		expect(Object.keys(saved.spec.panels)).toHaveLength(0);
	});

	test('TC-02 Create is disabled until the dashboard has a name', async ({
		dashboardList,
	}) => {
		await dashboardList.open();
		await dashboardList.newDashboardButton().click();

		await dashboardList.nameInput().fill('   ');
		await expect(dashboardList.submit()).toBeDisabled();

		await dashboardList.nameInput().fill(uniqueName('named'));
		await expect(dashboardList.submit()).toBeEnabled();
	});

	test('TC-03 a panel added to the new dashboard persists', async ({
		authedPage: page,
		dashboardList,
		dashboards,
		editor,
		newPanel,
		panels,
	}) => {
		await dashboardList.open();
		const id = await dashboardList.create({ name: uniqueName('first panel') });

		await dashboards.emptyAddPanel().click();
		await newPanel.choose(PanelKind.TimeSeries);
		await editor.title().fill('First panel');
		await editor.query.selectMetric(GOLDEN.metrics.calls);
		await editor.save();
		await page.waitForURL(PATH.onDashboard(id));

		await dashboards.reload();
		await expect(panels.titles()).toHaveText(['First panel']);

		const saved = await dashboards.get(id);
		const persisted = Object.values(saved.spec.panels);
		expect(persisted.map((panel) => panel.spec.plugin.kind)).toEqual([
			PanelKind.TimeSeries,
		]);
		expect(persisted[0].spec.queries).toHaveLength(1);
		expect(
			saved.spec.layouts.flatMap((layout) => layout.spec.items),
		).toHaveLength(1);
	});

	test('TC-04 a dashboard is deleted from the list and disappears', async ({
		dashboardList,
		dashboards,
	}) => {
		const name = uniqueName('doomed');
		await dashboardList.open();
		const id = await dashboardList.create({ name });

		await dashboardList.open(name);
		await expect(dashboardList.rowTitle(name)).toBeVisible();

		await dashboardList.delete(name);
		await expect(dashboardList.rowTitle(name)).toHaveCount(0);

		await dashboardList.open(name);
		await expect(dashboardList.rowTitle(name)).toHaveCount(0);
		await expect(dashboards.get(id)).rejects.toThrow(/404/);
	});
});
