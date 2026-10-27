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
		const [a, b, c] = ['a', 'b', 'c'].map((suffix) => `${prefix} ${suffix}`);
		// Created c, a, b, then updated a, c: every sort gives a different order.
		const ids: Record<string, string> = {};
		for (const name of [c, a, b]) {
			ids[name] = await dashboards.seed(listDashboard(name));
		}
		for (const name of [a, c]) {
			await dashboards.setLocked(ids[name], true);
			await dashboards.setLocked(ids[name], false);
		}
		await dashboardList.open(prefix);

		await dashboardList.sortBy('name');
		await expect(page).toHaveURL(/[?&]sort=name(&|$)/);
		await dashboardList.sortOrder('asc');
		await expect(page).toHaveURL(/[?&]order=asc(&|$)/);
		await expect(dashboardList.rows()).toHaveText([a, b, c]);

		await dashboardList.sortOrder('desc');
		await expect(page).not.toHaveURL(/[?&]order=asc/);
		await expect(dashboardList.rows()).toHaveText([c, b, a]);

		await dashboardList.sortBy('created');
		await expect(page).toHaveURL(/[?&]sort=created_at(&|$)/);
		await expect(dashboardList.rows()).toHaveText([b, a, c]);
		await expect(dashboardList.sortButton()).toContainText('Last created');

		// Last updated is the default, so picking it clears the param.
		await dashboardList.sortBy('updated');
		await expect(page).not.toHaveURL(/[?&]sort=/);
		await expect(dashboardList.rows()).toHaveText([c, a, b]);
	});

	test('TC-02 sort params on load are honoured', async ({
		authedPage: page,
		dashboards,
		dashboardList,
	}) => {
		const prefix = uniqueName('sort-load');
		const first = `${prefix} a`;
		const second = `${prefix} b`;
		// Last updated first by default, so name ascending reverses it.
		await dashboards.seed(listDashboard(first));
		await dashboards.seed(listDashboard(second));

		await dashboardList.open(prefix, { sort: 'name', order: 'asc' });

		await expect(page).toHaveURL(/[?&]sort=name(&|$)/);
		await expect(page).toHaveURL(/[?&]order=asc(&|$)/);
		await expect(dashboardList.sortButton()).toContainText('Name');
		await expect(dashboardList.rows()).toHaveText([first, second]);
	});
});
