import {
	expect,
	LIST_URL,
	listDashboard,
	test,
	uniqueName,
} from '../../../drivers/dashboard-list';

test.describe('Dashboards — list create and import', () => {
	test('TC-01 New dashboard offers Blank, template and Import JSON tabs', async ({
		dashboardList,
	}) => {
		await dashboardList.open();

		await dashboardList.openNewDashboard();

		await expect(dashboardList.newDashboardTabs()).toHaveText([
			'Blank',
			'From a template',
			'Import JSON',
		]);
		await expect(dashboardList.nameInput()).toHaveValue('Sample Dashboard');
	});

	test('TC-02 an uploaded JSON file imports and opens the dashboard', async ({
		dashboardList,
		dashboards,
	}) => {
		const name = uniqueName('import');
		await dashboardList.open();

		const id = await dashboardList.importJson(
			listDashboard(name, [{ key: 'team', value: 'e2e' }]),
		);

		await expect(dashboards.title()).toHaveText(name);
		const saved = await dashboards.get(id);
		expect(saved.spec.display.name).toBe(name);
		expect(saved.tags).toEqual([{ key: 'team', value: 'e2e' }]);
	});

	test('TC-03 Escape dismisses the dialog and stays on the list', async ({
		authedPage: page,
		dashboardList,
	}) => {
		await dashboardList.open();
		await dashboardList.openNewDashboard('Import JSON');

		await dashboardList.dismissWithEscape();

		await expect(dashboardList.newDashboardDialog()).toBeHidden();
		await expect(page).toHaveURL(LIST_URL);
	});

	test('TC-04 the close button dismisses the dialog and stays on the list', async ({
		authedPage: page,
		dashboardList,
	}) => {
		await dashboardList.open();
		await dashboardList.openNewDashboard('Import JSON');

		await dashboardList.closeDialog();

		await expect(dashboardList.newDashboardDialog()).toBeHidden();
		await expect(page).toHaveURL(LIST_URL);
	});
});
