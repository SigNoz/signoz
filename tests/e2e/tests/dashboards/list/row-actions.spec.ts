import {
	expect,
	listDashboard,
	LIST_URL,
	PATH,
	test,
	uniqueName,
} from '../../../drivers/dashboard-list';

test.describe('Dashboards — list row actions', () => {
	test('TC-01 an admin sees every row action', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('menu');
		await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);

		await dashboardList.openRowMenu(name);

		await expect(dashboardList.rowMenuItems()).toHaveText([
			'View',
			'Open in New Tab',
			'Copy Link',
			'Rename',
			'Add Tags',
			'Duplicate',
			'Lock Dashboard',
			'Delete Dashboard',
		]);
		// A denied action stays listed but disabled.
		await expect(
			dashboardList.rowMenu().getByRole('menuitem', { disabled: true }),
		).toHaveCount(0);
	});

	test('TC-02 Open in New Tab opens the dashboard in a new tab', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('new-tab');
		const id = await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);

		const tab = await dashboardList.openInNewTab(name);

		await expect(tab).toHaveURL(PATH.onDashboard(id));
		await tab.close();
	});

	test('TC-03 Copy Link copies the dashboard URL', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('copy');
		const id = await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);

		const copied = await dashboardList.copyLink(name);

		expect(new URL(copied).pathname).toMatch(PATH.onDashboard(id));
	});

	test('TC-04 the menu closes on a click outside it', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('dismiss');
		await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);
		await dashboardList.openRowMenu(name);

		await dashboardList.clickOutside();

		await expect(dashboardList.rowMenu()).toBeHidden();
		await expect(page).toHaveURL(LIST_URL);
	});

	test('TC-05 Delete asks for confirmation naming the dashboard', async ({
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('delete-confirm');
		await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);

		const confirm = await dashboardList.requestDelete(name);

		await expect(confirm).toContainText(
			`Are you sure you want to delete the ${name} dashboard?`,
		);
		await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeVisible();
		await expect(confirm.getByRole('button', { name: 'Delete' })).toBeVisible();
	});

	test('TC-06 cancelling Delete keeps the dashboard and stays on the list', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const name = uniqueName('delete-cancel');
		const id = await dashboards.seed(listDashboard(name));
		await dashboardList.open(name);
		await dashboardList.requestDelete(name);

		await dashboardList.cancelDelete();

		await expect(page).toHaveURL(LIST_URL);
		await expect(dashboardList.rowTitle(name)).toBeVisible();
		expect((await dashboards.get(id)).id).toBe(id);
	});
});
