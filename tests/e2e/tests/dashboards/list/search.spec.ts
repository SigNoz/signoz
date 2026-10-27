import {
	expect,
	listDashboard,
	nameContains,
	test,
	uniqueName,
} from '../../../drivers/dashboard-list';

test.describe('Dashboards — list search', () => {
	test('TC-01 searching by name writes the query to the URL and lists the match', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('search');
		await dashboards.seed(listDashboard(name));
		await dashboardList.open();

		await dashboardList.runSearch(nameContains(name));

		expect(new URL(page.url()).searchParams.get('query')).toBe(
			nameContains(name),
		);
		await expect(dashboardList.search()).toHaveText(nameContains(name));
		await expect(dashboardList.rows()).toHaveText([name]);
	});

	test('TC-02 searching by a tag lists the tagged dashboard', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('tagged');
		const value = name.split(' ').pop() as string;
		await dashboards.seed(listDashboard(name, [{ key: 'team', value }]));
		await dashboardList.open();

		await dashboardList.runSearch(`team = '${value}'`);

		await expect(dashboardList.rows()).toHaveText([name]);
	});

	test('TC-03 a query param on load pre-fills the search and filters the list', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('deeplink');
		await dashboards.seed(listDashboard(name));

		await dashboardList.open(name);

		await expect(dashboardList.search()).toHaveText(nameContains(name));
		await expect(dashboardList.rows()).toHaveText([name]);
	});

	test('TC-04 clearing the search drops the query and lists every dashboard', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('clear');
		const other = uniqueName('clear-other');
		await dashboards.seed(listDashboard(other));
		await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);
		await expect(dashboardList.rows()).toHaveText([name]);

		await dashboardList.clearFilters().click();

		await expect(page).not.toHaveURL(/[?&]query=/);
		await expect(dashboardList.searchPlaceholder()).toBeVisible();
		// Not the seeded rows by name: pinned and other workers' dashboards come
		// first, so either can fall off the first page.
		await expect.poll(() => dashboardList.rows().count()).toBeGreaterThan(1);
	});

	test('TC-05 a search with no match shows the no-results state', async ({
		dashboards,
		dashboardList,
	}) => {
		// The search box only renders once any dashboard exists.
		await dashboards.seed(listDashboard(uniqueName('unrelated')));
		const missing = uniqueName('missing');
		await dashboardList.open();

		await dashboardList.runSearch(nameContains(missing));

		await expect(dashboardList.noResults()).toContainText(missing);
		await expect(dashboardList.rows()).toHaveCount(0);
		await expect(dashboardList.search()).toHaveText(nameContains(missing));
	});

	test('TC-06 ILIKE matches a name regardless of case', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('Mixed CASE');
		await dashboards.seed(listDashboard(name));
		await dashboardList.open();

		await dashboardList.runSearch(`name ILIKE '%${name.toLowerCase()}%'`);

		await expect(dashboardList.rows()).toHaveText([name]);
	});
});
