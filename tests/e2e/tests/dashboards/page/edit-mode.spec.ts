import {
	DashboardAction,
	compactDashboard,
	expect,
	test,
} from '../../../drivers/dashboard-page';

test.describe('Dashboards — edit mode', () => {
	test('TC-01 the Actions menu lists every dashboard action', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.actions.open();

		for (const action of Object.values(DashboardAction)) {
			await expect(dashboardPage.actions.item(action)).toBeEnabled();
		}
		await expect(dashboardPage.actions.item(DashboardAction.lock)).toHaveText(
			'Lock dashboard',
		);
	});

	test('TC-02 locking disables the edit affordances and persists', async ({
		dashboards,
		dashboardPage,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.lock();

		await expect(dashboardPage.toolbar.configure()).toBeDisabled();
		await expect(dashboardPage.toolbar.newPanel()).toBeDisabled();
		await dashboardPage.actions.open();
		for (const action of [
			DashboardAction.rename,
			DashboardAction.newSection,
			DashboardAction.delete,
		]) {
			await expect(dashboardPage.actions.item(action)).toBeDisabled();
		}
		await expect.poll(async () => (await dashboards.get(id)).locked).toBe(true);
	});

	test('TC-03 renaming updates the title and breadcrumb', async ({
		dashboards,
		dashboardPage,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());
		const renamed = `Renamed-${Date.now()}`;

		await dashboardPage.rename.to(renamed);

		await expect(dashboardPage.breadcrumb()).toContainText(renamed);
		await expect
			.poll(async () => (await dashboards.get(id)).spec.display.name)
			.toBe(renamed);
	});

	test('TC-04 cancelling a rename leaves the name unchanged', async ({
		dashboards,
		dashboardPage,
	}) => {
		const fixture = compactDashboard();
		const original = fixture.spec.display.name;
		await dashboards.seedAndOpen(fixture);

		await dashboardPage.actions.run(DashboardAction.rename);
		await dashboardPage.rename.input().fill('Should Not Be Saved');
		await dashboardPage.rename.cancel().click();

		await expect(dashboardPage.title()).toHaveText(original);
		await expect(dashboardPage.breadcrumb()).toContainText(original);
	});

	test('TC-05 a section added from the Actions menu can be removed', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());
		const title = `e2e-section-${Date.now()}`;

		await dashboardPage.addSection(title);
		await dashboardPage.section(title).delete();

		await expect(dashboardPage.section(title).root()).toHaveCount(0);
	});

	test('TC-06 the JSON drawer downloads the dashboard as .json', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.json.open();

		expect(await dashboardPage.json.download()).toMatch(/\.json$/);
	});

	test('TC-07 the JSON drawer copies the dashboard JSON', async ({
		dashboards,
		dashboardPage,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'clipboard-read is a Chromium-only permission',
		);
		const fixture = compactDashboard();
		await dashboards.seedAndOpen(fixture);

		await dashboardPage.json.open();
		const copied = JSON.parse(await dashboardPage.json.copy()) as {
			spec?: { display?: { name?: string } };
		};

		expect(copied.spec?.display?.name).toBe(fixture.spec.display.name);
	});

	test('TC-08 Full screen shows only the grid and exits cleanly', async ({
		dashboards,
		dashboardPage,
	}) => {
		const collected = dashboardPage.collectPageErrors();
		await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.actions.run(DashboardAction.fullScreen);

		await expect.poll(() => dashboardPage.isFullScreen()).toBe(true);
		await expect(dashboardPage.title()).toBeHidden();
		await expect(dashboardPage.section('Charts').panels()).toHaveCount(1);

		await dashboardPage.exitFullScreen();

		await expect(dashboardPage.title()).toBeVisible();
		expect(collected.errors).toEqual([]);
	});

	test('TC-09 lock then unlock restores the edit affordances', async ({
		dashboards,
		dashboardPage,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());

		await dashboardPage.lock();
		await dashboardPage.actions.open();
		await expect(dashboardPage.actions.item(DashboardAction.lock)).toHaveText(
			'Unlock dashboard',
		);
		await dashboardPage.actions.item(DashboardAction.lock).click();
		await expect(dashboardPage.lockToggle()).toHaveAccessibleName(
			'Lock dashboard',
		);

		await expect(dashboardPage.toolbar.newPanel()).toBeEnabled();
		await dashboardPage.actions.open();
		await expect(
			dashboardPage.actions.item(DashboardAction.rename),
		).toBeEnabled();
		await expect(
			dashboardPage.actions.item(DashboardAction.newSection),
		).toBeEnabled();
		await expect.poll(async () => (await dashboards.get(id)).locked).toBe(false);
	});

	test('TC-10 a rename survives a reload', async ({
		dashboards,
		dashboardPage,
	}) => {
		const id = await dashboards.seedAndOpen(compactDashboard());
		const renamed = `Renamed-Persist-${Date.now()}`;

		await dashboardPage.rename.to(renamed);
		await expect
			.poll(async () => (await dashboards.get(id)).spec.display.name)
			.toBe(renamed);

		await dashboards.reload();

		await expect(dashboardPage.title()).toHaveText(renamed);
		await expect.poll(() => dashboardPage.documentTitle()).toBe(renamed);
	});
});
