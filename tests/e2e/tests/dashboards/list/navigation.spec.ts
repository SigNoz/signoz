import {
	expect,
	listDashboard,
	nameContains,
	LIST_URL,
	PATH,
	test,
	uniqueName,
} from '../../../drivers/dashboard-list';

test.describe('Dashboards — list navigation', () => {
	test('TC-01 the page renders its chrome and core controls', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('chrome');
		await dashboards.seed(listDashboard(name));

		await dashboardList.open(name);

		await expect(page).toHaveTitle('SigNoz | All Dashboards');
		await expect(dashboardList.heading()).toHaveText('All dashboards');
		await expect(dashboardList.search()).toBeVisible();
		await expect(dashboardList.newDashboardButton()).toBeVisible();
		await expect(dashboardList.sortButton()).toBeVisible();
		await expect(dashboardList.rowTitle(name)).toBeVisible();
		await expect(dashboardList.feedbackButton()).toBeVisible();
		await expect(dashboardList.shareButton()).toBeVisible();
	});

	test('TC-02 clicking a row opens its dashboard', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('row');
		const id = await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);

		await dashboardList.openRow(name);

		await expect(page).toHaveURL(PATH.onDashboard(id));
	});

	test('TC-03 View opens the dashboard detail page', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('view');
		const id = await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);
		await dashboardList.openRowMenu(name);

		await dashboardList.rowAction('view').click();

		await expect(page).toHaveURL(PATH.onDashboard(id));
		await expect(dashboards.title()).toHaveText(name);
	});

	test('TC-04 the sidebar Dashboards entry opens the list', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		await dashboards.visit('/home');

		await dashboardList.sidebarDashboards().click();

		await expect(page).toHaveURL(LIST_URL);
		await expect(page).toHaveTitle('SigNoz | All Dashboards');
	});

	test('TC-05 the sidebar Dashboards entry leaves a dashboard for the list', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('sidebar');
		const id = await dashboards.seed(listDashboard(name));
		await dashboards.openEmpty(id);
		await expect(dashboards.title()).toHaveText(name);

		await dashboardList.sidebarDashboards().click();

		await expect(page).toHaveURL(LIST_URL);
		await expect(dashboardList.heading()).toHaveText('All dashboards');
	});

	test('TC-06 Back from a dashboard restores the search', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('back');
		const id = await dashboards.seed(listDashboard(name));
		// Typed, not opened with the param, so Back replays the app's own write.
		await dashboardList.open();
		await dashboardList.runSearch(nameContains(name));
		await expect(dashboardList.rows()).toHaveText([name]);
		await dashboardList.openRow(name);
		await expect(page).toHaveURL(PATH.onDashboard(id));

		await dashboardList.back();

		await expect(page).toHaveURL(LIST_URL);
		expect(new URL(page.url()).searchParams.get('query')).toBe(
			nameContains(name),
		);
		await expect(dashboardList.search()).toHaveText(nameContains(name));
		await expect(dashboardList.rows()).toHaveText([name]);
	});
});
