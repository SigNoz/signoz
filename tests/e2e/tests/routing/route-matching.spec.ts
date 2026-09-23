import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	authToken,
	createDashboardViaApi,
	deleteDashboardViaApi,
} from '../../helpers/dashboards';
import { gotoLogsExplorer } from '../../helpers/logs-explorer';
import {
	activeRouteTab,
	dashboardRowByTitle,
	DASHBOARDS_LIST_PATH,
	goBackTo,
	historyDepth,
	HOME_PATH,
	METRICS_EXPLORER_SUMMARY_PATH,
	METRICS_EXPLORER_VIEWS_PATH,
	globalTimePicker,
	ROLES_SETTINGS_PATH,
	routeTab,
	SERVICES_PATH,
	uniqueSuffix,
	UNKNOWN_PATH,
	urlOf,
} from '../../helpers/routing';

// Guards hazards 3, 5, 8 and 10 — every place a `matchPath` / `generatePath`
// call decides what renders. `RouteTab` alone runs `matchPath` with `exact`,
// `generatePath` and `history.push`; `TopNav` runs `matchPath` over ~70 routes
// on every single route change; `SETTINGS` is one of the four routes that rely
// on v5 prefix matching and needs an explicit `/*` under v6.

const DASHBOARD_TITLE = `routing-route-matching-${uniqueSuffix()}`;

let dashboardId = '';

test.describe('Routing — route matching', () => {
	test.beforeAll(async ({ browser }) => {
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		try {
			dashboardId = await createDashboardViaApi(page, DASHBOARD_TITLE);
		} finally {
			await ctx.close();
		}
	});

	test.afterAll(async ({ browser }) => {
		const ctx = await newAdminContext(browser);
		const page = await ctx.newPage();
		try {
			await deleteDashboardViaApi(ctx.request, dashboardId, await authToken(page));
		} finally {
			await ctx.close();
		}
	});

	test('TC-09 RouteTab switches the url and survives a reload', async ({
		authedPage: page,
	}) => {
		await page.goto(METRICS_EXPLORER_SUMMARY_PATH);
		await expect(
			activeRouteTab(page, METRICS_EXPLORER_SUMMARY_PATH),
		).toBeVisible();

		await routeTab(page, METRICS_EXPLORER_VIEWS_PATH).click();
		await page.waitForURL((url) => url.pathname === METRICS_EXPLORER_VIEWS_PATH);
		expect(urlOf(page).pathname).toBe(METRICS_EXPLORER_VIEWS_PATH);
		await expect(activeRouteTab(page, METRICS_EXPLORER_VIEWS_PATH)).toBeVisible();

		await page.reload();
		expect(urlOf(page).pathname).toBe(METRICS_EXPLORER_VIEWS_PATH);
		await expect(activeRouteTab(page, METRICS_EXPLORER_VIEWS_PATH)).toBeVisible();
	});

	test('TC-10 a prefix-route deep link loads with the right tab selected', async ({
		authedPage: page,
	}) => {
		await page.goto(ROLES_SETTINGS_PATH);

		expect(urlOf(page).pathname).toBe(ROLES_SETTINGS_PATH);
		await expect(page.getByTestId('settings-page-sidenav')).toBeVisible();
		await expect(page.getByTestId('roles')).toHaveClass(/active/);
		await expect(page.getByTestId('roles-settings')).toBeVisible();
	});

	test('TC-11 a seeded dashboard id round-trips byte-identical', async ({
		authedPage: page,
	}) => {
		const detailPath = `${DASHBOARDS_LIST_PATH}/${dashboardId}`;

		await page.goto(`${DASHBOARDS_LIST_PATH}?search=${DASHBOARD_TITLE}`);
		const row = dashboardRowByTitle(page, DASHBOARD_TITLE);
		await expect(row).toBeVisible();
		await row.click();

		await page.waitForURL((url) =>
			url.pathname.startsWith(`${DASHBOARDS_LIST_PATH}/`),
		);
		// Byte-identical on purpose: any re-encoding of the uuid shows up here.
		expect(urlOf(page).pathname).toBe(detailPath);
		await expect(page.getByTestId('dashboard-title')).toHaveText(DASHBOARD_TITLE);

		await page.reload();
		expect(urlOf(page).pathname).toBe(detailPath);
		await expect(page.getByTestId('dashboard-title')).toHaveText(DASHBOARD_TITLE);
	});

	test('TC-12 the global time picker renders only where matchPath allows it', async ({
		authedPage: page,
	}) => {
		await page.goto(`${SERVICES_PATH}?relativeTime=30m`);
		await expect(globalTimePicker(page)).toBeVisible();

		// LOGS_EXPLORER is in `routesToDisable`, so `TopNav` renders nothing —
		// the explorer's own toolbar picker is out of scope here by design.
		await gotoLogsExplorer(page);
		await expect(globalTimePicker(page)).toHaveCount(0);

		// ROLES_SETTINGS is in `routesToSkip`.
		await page.goto(ROLES_SETTINGS_PATH);
		await expect(page.getByTestId('roles-settings')).toBeVisible();
		await expect(globalTimePicker(page)).toHaveCount(0);
	});

	// Deviation from the plan, kept deliberately: 0.1 asks for "renders NotFound
	// and the url stays put", but on v5 `PrivateRoute` reaches its unknown-route
	// branch before the `<Switch>` ever runs and `<Redirect>`s a logged-in user to
	// HOME, so `components/NotFound` is unreachable while authenticated. This pins
	// what v5 actually does, including the replace, so both the catch-all and the
	// redirect semantics stay observable through the flip.
	test('TC-13 an unknown path redirects home and replaces its history entry', async ({
		authedPage: page,
	}) => {
		await page.goto(DASHBOARDS_LIST_PATH);
		await expect(
			page.getByRole('heading', { name: 'Dashboards', level: 1 }),
		).toBeVisible();
		const depthBefore = await historyDepth(page);

		await page.goto(UNKNOWN_PATH);
		await page.waitForURL((url) => url.pathname !== UNKNOWN_PATH);

		expect(urlOf(page).pathname).toBe(HOME_PATH);
		await expect(page.getByTestId('not-found')).toHaveCount(0);

		// The navigation added one entry and the redirect replaced it, so a single
		// Back reaches the list rather than the unknown path.
		expect(await historyDepth(page)).toBe(depthBefore + 1);
		await goBackTo(page, DASHBOARDS_LIST_PATH);
	});
});
