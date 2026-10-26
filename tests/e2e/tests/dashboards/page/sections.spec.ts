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
	test('TC-01 collapsing a section hides its panels and keeps its header', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const tabular = dashboardPage.section('Tabular');

		await tabular.collapse();

		await expect(tabular.toggle()).toBeVisible();
		await expect(panels.panel(COMPACT_PANELS.table).root()).toBeHidden();
		await expect(panels.panel(COMPACT_PANELS.list).root()).toBeHidden();
	});

	test('TC-02 expanding restores every panel the section held', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const tabular = dashboardPage.section('Tabular');
		const before = await tabular.panels().count();

		await tabular.collapse();
		await tabular.expand();

		await expect(tabular.panels()).toHaveCount(before);
	});

	test('TC-03 the section menu offers add, rename, clone and delete', async ({
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

	test('TC-04 renaming a section updates its header and persists', async ({
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

	test('TC-05 cancelling a section rename leaves the title unchanged', async ({
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

	test('TC-06 a section added from the Actions menu can be deleted', async ({
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

	test('TC-07 two sections collapse in sequence and both stay collapsed', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const charts = dashboardPage.section('Charts');
		const tabular = dashboardPage.section('Tabular');

		await charts.collapse();
		await tabular.collapse();

		await expect(charts.panels()).toHaveCount(0);
		await expect(tabular.panels()).toHaveCount(0);

		await charts.expand();
		await tabular.expand();
		await expect(charts.panels()).toHaveCount(1);
		await expect(tabular.panels()).toHaveCount(2);
	});

	test('TC-08 a collapsed section unmounts its panels and spares the others', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.section('Charts').collapse();

		await expect(panels.panel(COMPACT_PANELS.timeseries).root()).toHaveCount(0);
		await expect(panels.panel(COMPACT_PANELS.table).root()).toHaveCount(1);
	});
});
