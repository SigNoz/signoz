import {
	SINGLE_PANEL_ID,
	compactDashboard,
	expect,
	singlePanelDashboard,
	test,
} from '../../../drivers/dashboard-page';

const MISSING_ID = 'nonexistent-id-99999';

// 2023-01-01, one minute: long before any golden telemetry.
const FAR_PAST = '?startTime=1672531200000&endTime=1672531260000';

test.describe('Dashboards — edge cases', () => {
	test('TC-01 panels show their empty state for a far-past range', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		const collected = dashboardPage.collectPageErrors();
		const id = await dashboards.seed(singlePanelDashboard());

		await dashboards.visit(`/dashboard/${id}${FAR_PAST}`);

		const target = panels.panel(SINGLE_PANEL_ID);
		await target.scrollIntoView();
		await expect(target.noData()).toBeVisible();
		expect(collected.errors).toEqual([]);
	});

	test('TC-02 a nonexistent dashboard id shows a load error', async ({
		dashboards,
		dashboardPage,
	}) => {
		await dashboards.visit(`/dashboard/${MISSING_ID}`);

		// The fetch retries before giving up.
		await expect(dashboardPage.loadError()).toBeVisible({ timeout: 20_000 });
		await expect(dashboardPage.breadcrumb()).toHaveCount(0);
	});

	test('TC-03 the side nav still works after a nonexistent dashboard', async ({
		dashboards,
		dashboardPage,
		authedPage: page,
	}) => {
		await dashboards.visit(`/dashboard/${MISSING_ID}`);
		await expect(dashboardPage.loadError()).toBeVisible({ timeout: 20_000 });

		await dashboardPage.navigateSideNav('Dashboards');

		await expect(page).toHaveURL(/\/dashboard(\?|$)/);
		await expect(dashboardPage.listPage()).toBeVisible();
	});

	test('TC-04 an inverted time range does not crash the dashboard', async ({
		dashboards,
		dashboardPage,
		panels,
	}) => {
		const collected = dashboardPage.collectPageErrors();
		const fixture = singlePanelDashboard();
		const id = await dashboards.seed(fixture);

		await dashboards.visit(`/dashboard/${id}?startTime=999999&endTime=999998`);

		await expect(dashboardPage.title()).toHaveText(fixture.spec.display.name);
		// The title renders before the query returns; the errors only count once
		// the inverted range has reached the panel.
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.noData().or(target.error())).toBeVisible();
		expect(collected.errors).toEqual([]);
	});

	test('TC-05 a name at the 128-character limit keeps the toolbar on screen', async ({
		dashboards,
		dashboardPage,
	}) => {
		const longName = `LongName-${'x'.repeat(119)}`;
		await dashboards.seedAndOpen(compactDashboard(longName));

		await expect(dashboardPage.title()).toHaveText(longName);
		await expect(dashboardPage.toolbar.configure()).toBeInViewport();
		await expect(dashboardPage.toolbar.newPanel()).toBeInViewport();
	});

	test('TC-06 special characters in the name round-trip unescaped', async ({
		dashboards,
		dashboardPage,
	}) => {
		const trickyName = `Spec & Chars / "${Date.now()}" — émoji 🎯`;
		await dashboards.seedAndOpen(compactDashboard(trickyName));

		await expect(dashboardPage.title()).toHaveText(trickyName);
		await expect(dashboardPage.breadcrumb()).toContainText(trickyName);
		await expect.poll(() => dashboardPage.documentTitle()).toBe(trickyName);
	});
});
