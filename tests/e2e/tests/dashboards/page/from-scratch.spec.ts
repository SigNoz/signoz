import {
	expect,
	GOLDEN,
	PANEL_TYPE_TILES,
	PanelKind,
	PATH,
	test,
} from '../../../drivers/dashboard-list';

// Scope: a dashboard built entirely through the UI — the list page's Blank
// create flow, one panel of every queryable kind, and deletion from the list.

/** Text carries no query. */
const QUERYABLE = PANEL_TYPE_TILES.filter(
	(tile) => tile.kind !== PanelKind.Text,
);

/** List seeds a logs query that saves as-is; every other kind seeds metrics. */
const METRICS_TILES = QUERYABLE.filter((tile) => tile.kind !== PanelKind.List);

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

	test('TC-03 one panel of every queryable kind is added and persists', async ({
		authedPage: page,
		dashboardList,
		dashboards,
		editor,
		newPanel,
		panels,
	}) => {
		await dashboardList.open();
		const id = await dashboardList.create({ name: uniqueName('all kinds') });

		await dashboards.emptyAddPanel().click();
		await newPanel.choose(PanelKind.List);
		await editor.title().fill('List panel');
		await editor.save();
		await page.waitForURL(PATH.onDashboard(id));
		await expect(panels.titles().filter({ hasText: 'List panel' })).toBeVisible();

		for (const { kind, label } of METRICS_TILES) {
			await dashboards.headerAddPanel().click();
			await newPanel.choose(kind);
			expect(dashboards.param('panelKind')).toBe(kind);
			await expect(editor.root()).toBeVisible();

			await editor.title().fill(`${label} panel`);
			await editor.query.selectMetric(GOLDEN.metrics.calls);
			await editor.save();
			await page.waitForURL(PATH.onDashboard(id));
			await expect(
				panels.titles().filter({ hasText: `${label} panel` }),
			).toBeVisible();
		}

		await dashboards.reload();
		for (const { label } of QUERYABLE) {
			await expect(
				panels.titles().filter({ hasText: `${label} panel` }),
			).toBeVisible();
		}
		await expect(panels.titles()).toHaveCount(QUERYABLE.length);

		const saved = await dashboards.get(id);
		const persisted = Object.values(saved.spec.panels);
		expect(persisted.map((panel) => panel.spec.plugin.kind).sort()).toEqual(
			QUERYABLE.map((tile) => tile.kind).sort(),
		);
		for (const panel of persisted) {
			expect(panel.spec.queries).toHaveLength(1);
		}
		const items = saved.spec.layouts.flatMap((layout) => layout.spec.items);
		expect(items).toHaveLength(QUERYABLE.length);
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
