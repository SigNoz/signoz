import { expect, PATH, test } from '../../drivers/routing';

// Every place a `matchPath` / `generatePath` call decides what renders:
// `RouteTab`, `TopNav`'s per-route checks, and `SETTINGS`, a prefix route that
// needs an explicit `/*` under v7.

test.describe('Routing — route matching', () => {
	test('TC-09 RouteTab switches the url and survives a reload', async ({
		routing,
	}) => {
		await routing.goto(PATH.metricsSummary);
		await expect(routing.activeRouteTab(PATH.metricsSummary)).toBeVisible();

		await routing.routeTab(PATH.metricsViews).click();
		await routing.waitForPath(PATH.metricsViews);
		await expect(routing.activeRouteTab(PATH.metricsViews)).toBeVisible();

		await routing.reload();
		expect(routing.url().pathname).toBe(PATH.metricsViews);
		await expect(routing.activeRouteTab(PATH.metricsViews)).toBeVisible();
	});

	test('TC-10 a prefix-route deep link loads with the right tab selected', async ({
		authedPage: page,
		routing,
	}) => {
		await routing.goto(PATH.roles);

		expect(routing.url().pathname).toBe(PATH.roles);
		await expect(page.getByTestId('settings-page-sidenav')).toBeVisible();
		await expect(page.getByTestId('roles')).toHaveClass(/active/);
		await expect(routing.roles.settings()).toBeVisible();
	});

	test('TC-11 a seeded dashboard id round-trips byte-identical', async ({
		routing,
		dashboard,
	}) => {
		await routing.dashboards.gotoList(dashboard.title);
		await routing.dashboards.row(dashboard.title).click();

		// Exact match: any re-encoding of the uuid fails here.
		await routing.waitForPath(dashboard.path);
		await expect(routing.dashboards.title()).toHaveText(dashboard.title);

		await routing.reload();
		expect(routing.url().pathname).toBe(dashboard.path);
		await expect(routing.dashboards.title()).toHaveText(dashboard.title);
	});

	test('TC-12 the global time picker renders only where matchPath allows it', async ({
		routing,
	}) => {
		await routing.goto(`${PATH.services}?relativeTime=30m`);
		await expect(routing.globalTimePicker()).toBeVisible();

		// LOGS_EXPLORER is in `routesToDisable`.
		await routing.gotoLogsExplorer();
		await expect(routing.globalTimePicker()).toHaveCount(0);

		// ROLES_SETTINGS is in `routesToSkip`.
		await routing.goto(PATH.roles);
		await expect(routing.roles.settings()).toBeVisible();
		await expect(routing.globalTimePicker()).toHaveCount(0);
	});

	// `PrivateRoute` redirects a logged-in user on an unknown path to HOME before
	// the catch-all runs, so `NotFound` is unreachable while authenticated.
	test('TC-13 an unknown path redirects home and replaces its history entry', async ({
		authedPage: page,
		routing,
	}) => {
		await routing.dashboards.gotoList();
		const depthBefore = await routing.historyDepth();

		await routing.goto(PATH.unknown);
		await routing.waitForPath(PATH.home);
		await expect(page.getByTestId('not-found')).toHaveCount(0);

		// The redirect replaced the entry, so one Back reaches the list.
		expect(await routing.historyDepth()).toBe(depthBefore + 1);
		await routing.goBackTo(PATH.dashboards);
	});
});
