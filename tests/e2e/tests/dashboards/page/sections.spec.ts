import {
	COMPACT_PANELS,
	SectionAction,
	compactDashboard,
	expect,
	test,
} from '../../../drivers/dashboard-page';

// Collapse is a per-user preference kept in the browser, not in the spec;
// rename, add and delete are patches to the spec.

test.describe('Dashboards — sections', () => {
	test('TC-01 a collapsed section unmounts its panels and stays collapsed after a reload', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const tabular = dashboardPage.section('Tabular');

		await tabular.collapse();
		await expect(tabular.toggle()).toBeVisible();
		await expect(tabular.panels()).toHaveCount(0);
		await expect(panels.panel(COMPACT_PANELS.timeseries).root()).toHaveCount(1);

		await dashboards.reload();
		await expect(panels.panel(COMPACT_PANELS.timeseries).root()).toHaveCount(1);
		await expect(tabular.panels()).toHaveCount(0);

		await tabular.expand();
		await expect(tabular.panels()).toHaveCount(2);
	});

	test('TC-02 the section menu offers add, rename, clone and delete', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const charts = dashboardPage.section('Charts');

		await charts.openMenu();

		for (const label of Object.values(SectionAction)) {
			await expect(charts.menuItem(label)).toBeEnabled();
		}
	});

	test('TC-03 renaming a section updates its header and persists', async ({
		dashboards,
		dashboardPage,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());
		const renamed = `Renamed ${Date.now()}`;

		await dashboardPage.section('Charts').rename(renamed);

		await expect(dashboardPage.section(renamed).toggle()).toBeVisible();
		await expect(dashboardPage.section('Charts').root()).toHaveCount(0);
		await expect
			.poll(async () =>
				(await dashboards.get(id)).spec.layouts.map(
					(layout) => layout.spec.display.title,
				),
			)
			.toEqual([renamed, 'Tabular']);
	});

	test('TC-04 cancelling a section rename leaves the title unchanged', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const tabular = dashboardPage.section('Tabular');

		await tabular.startRename();
		await dashboardPage.sectionModal.input().fill('Should not be applied');
		await dashboardPage.sectionModal.cancel().click();

		await expect(dashboardPage.sectionModal.input()).toBeHidden();
		await expect(tabular.toggle()).toBeVisible();
		await expect(
			dashboardPage.section('Should not be applied').root(),
		).toHaveCount(0);
	});

	test('TC-05 a section added from the Actions menu can be deleted', async ({
		dashboards,
		dashboardPage,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());
		const title = `Temp section ${Date.now()}`;

		await dashboardPage.addSection(title);
		await expect
			.poll(async () => (await dashboards.get(id)).spec.layouts.length)
			.toBe(3);

		await dashboardPage.section(title).delete();

		await expect(dashboardPage.sectionTitles()).toHaveText(['Charts', 'Tabular']);
		await expect
			.poll(async () => (await dashboards.get(id)).spec.layouts.length)
			.toBe(2);
	});
});
