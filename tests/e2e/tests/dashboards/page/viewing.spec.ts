import {
	COMPACT_PANELS,
	compactDashboard,
	expect,
	PanelKind,
	test,
} from '../../../drivers/dashboard-page';

test.describe('Dashboards — viewing', () => {
	test('TC-01 page chrome renders the breadcrumb, title and toolbar', async ({
		dashboards,
		dashboardPage,
	}) => {
		const fixture = compactDashboard();
		const name = fixture.spec.display.name;
		await dashboards.seedAndOpen(fixture);

		await expect(dashboardPage.breadcrumbHome()).toBeVisible();
		await expect(dashboardPage.breadcrumb()).toContainText(name);
		await expect(dashboardPage.title()).toHaveText(name);
		await expect.poll(() => dashboardPage.documentTitle()).toBe(name);

		const { toolbar } = dashboardPage;
		for (const control of [
			toolbar.timePicker(),
			toolbar.refresh(),
			toolbar.autoRefresh(),
			toolbar.actions(),
			toolbar.configure(),
			toolbar.json(),
			toolbar.newPanel(),
			toolbar.feedback(),
			toolbar.share(),
		]) {
			await expect(control).toBeVisible();
		}
	});

	test('TC-02 the breadcrumb returns to the dashboards list', async ({
		dashboards,
		dashboardPage,
		authedPage: page,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.breadcrumbHome().click();

		await expect(page).toHaveURL(/\/dashboard(\?|$)/);
		await expect(dashboardPage.listPage()).toBeVisible();
	});

	test('TC-03 the tags bar shows two tags and folds the rest', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen({
			...compactDashboard(),
			tags: [
				{ key: 'team', value: 'apm' },
				{ key: 'latency', value: 'latency' },
				{ key: 'tier', value: 'gold' },
			],
		});

		// A tag whose key equals its value renders as the bare key.
		await expect(dashboardPage.tags()).toContainText('team:apm');
		await expect(dashboardPage.tags()).toContainText('latency');
		await expect(dashboardPage.tags()).not.toContainText('tier:gold');
		await expect(dashboardPage.tagsOverflow()).toHaveText('+1');
	});

	test('TC-04 section headers render', async ({ dashboards, dashboardPage }) => {
		await dashboards.seedAndOpen(compactDashboard());

		await expect(dashboardPage.sectionTitles()).toHaveText(['Charts', 'Tabular']);
	});

	test('TC-05 panels render inside their sections', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await expect(dashboardPage.section('Charts').panels()).toHaveCount(1);
		await expect(dashboardPage.section('Tabular').panels()).toHaveCount(2);
		await expect(
			dashboardPage.section('Charts').root().getByText('Calls by service'),
		).toBeVisible();
	});

	test('TC-06 the initial load raises no page error', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		const collected = dashboardPage.collectPageErrors();

		await dashboards.seedAndOpen(compactDashboard());
		// Settled, not just titled: the errors only count once the data is in.
		for (const [id, kind] of [
			[COMPACT_PANELS.timeseries, PanelKind.TimeSeries],
			[COMPACT_PANELS.table, PanelKind.Table],
		] as const) {
			const target = panels.panel(id);
			await expect(
				target.renderer(kind).or(target.noData()).first(),
			).toBeVisible();
		}

		expect(collected.errors).toEqual([]);
	});
});
