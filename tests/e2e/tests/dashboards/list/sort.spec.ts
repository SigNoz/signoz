import {
	expect,
	listDashboard,
	test,
	uniqueName,
} from '../../../drivers/dashboard-list';

test.describe('Dashboards — list sort', () => {
	test('TC-01 sort options write sort and order to the URL and reorder rows', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const prefix = uniqueName('sort');
		const first = `${prefix} a`;
		const second = `${prefix} b`;
		await dashboards.seed(listDashboard(first));
		await dashboards.seed(listDashboard(second));
		await dashboardList.open(prefix);

		await dashboardList.sortBy('name');
		await expect(page).toHaveURL(/[?&]sort=name(&|$)/);
		await dashboardList.sortOrder('asc');
		await expect(page).toHaveURL(/[?&]order=asc(&|$)/);
		await expect(dashboardList.rows()).toHaveText([first, second]);

		await dashboardList.sortOrder('desc');
		await expect(page).not.toHaveURL(/[?&]order=asc/);
		await expect(dashboardList.rows()).toHaveText([second, first]);

		await dashboardList.sortBy('created');
		await expect(page).toHaveURL(/[?&]sort=created_at(&|$)/);
		await expect(dashboardList.rows()).toHaveText([second, first]);
		await expect(dashboardList.sortButton()).toContainText('Last created');
	});

	test('TC-02 sort params on load are honoured', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const prefix = uniqueName('sort-load');
		const first = `${prefix} a`;
		const second = `${prefix} b`;
		await dashboards.seed(listDashboard(second));
		await dashboards.seed(listDashboard(first));

		await dashboardList.open(prefix, { sort: 'name', order: 'asc' });

		await expect(page).toHaveURL(/[?&]sort=name(&|$)/);
		await expect(page).toHaveURL(/[?&]order=asc(&|$)/);
		await expect(dashboardList.sortButton()).toContainText('Name');
		await expect(dashboardList.rows()).toHaveText([first, second]);
	});
});
