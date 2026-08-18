import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	authToken,
	createDashboardViaApi,
	deleteDashboardViaApi,
} from '../../helpers/dashboards';
import {
	dashboardRowByTitle,
	DASHBOARDS_LIST_PATH,
	goBackTo,
	gotoK8sList,
	historyDepth,
	K8S_LIST_PATH,
	openInNewTabByModifierClick,
	relativeTimeLabel,
	SERVICES_PATH,
	seedWithRetry,
	selectRelativeTime,
	timePicker,
	TRACES_EXPLORER_PATH,
	uniqueSuffix,
	urlOf,
} from '../../helpers/routing';
import {
	gotoTraceUntilLoaded,
	loadLargeTrace,
	seedTracesViaSeeder,
} from '../../helpers/trace-details';

// Guards hazard 6 (`history.listen`'s signature change, which silently kills the
// `inAppPushCount` counter behind `hasInAppHistory()`) and the push/replace half
// of hazard 1: the 199 imperative `push`/`replace` sites, `useSafeNavigate`'s
// same-url suppression, and the `newTab` branch that bypasses the router.

const DASHBOARD_TITLE = `routing-navigation-${uniqueSuffix()}`;
const trace = loadLargeTrace();

let dashboardId = '';

test.describe('Routing — imperative navigation', () => {
	test.beforeAll(async ({ browser, playwright }) => {
		const request = await playwright.request.newContext();
		try {
			await seedWithRetry(() => seedTracesViaSeeder(request, trace.spans));
		} finally {
			await request.dispose();
		}

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

	test('TC-05 Back from a detail page restores the list with its params', async ({
		authedPage: page,
	}) => {
		const listSearch = `search=${DASHBOARD_TITLE}&columnKey=updatedAt&order=descend&page=1`;
		await page.goto(`${DASHBOARDS_LIST_PATH}?${listSearch}`);

		const row = dashboardRowByTitle(page, DASHBOARD_TITLE);
		await expect(row).toBeVisible();
		await row.click();
		await page.waitForURL(
			(url) => url.pathname === `${DASHBOARDS_LIST_PATH}/${dashboardId}`,
		);

		await goBackTo(page, DASHBOARDS_LIST_PATH);

		const url = urlOf(page);
		expect(url.pathname).toBe(DASHBOARDS_LIST_PATH);
		expect(url.searchParams.get('search')).toBe(DASHBOARD_TITLE);
		expect(url.searchParams.get('columnKey')).toBe('updatedAt');
		expect(url.searchParams.get('order')).toBe('descend');
		expect(url.searchParams.get('page')).toBe('1');
	});

	// Both branches of `TraceDetailsHeader`'s previous button —
	// `hasInAppHistory() ? history.goBack() : history.push(TRACES_EXPLORER)` — in
	// one document, so the `inAppPushCount` listener is what decides the outcome.
	// Deliberately does not enter through the traces list: the seeder writes spans
	// the explorer's trace view does not return, and the entry path is irrelevant
	// to what this test measures.
	test('TC-06 the trace-details previous button pushes when deep-linked and pops once in-app', async ({
		authedPage: page,
	}) => {
		// A real page under /trace/<id> in the history, so the in-app pop below has
		// somewhere in-app to land.
		await page.goto(SERVICES_PATH);
		await gotoTraceUntilLoaded(
			page,
			`/trace/${trace.traceId}`,
			`cell-0-${trace.landmarks.root}`,
		);

		const backButton = page.getByRole('button', { name: 'Back' });

		// Deep-linked: the document load reset `inAppPushCount`, so the button
		// pushes the bare explorer route and the depth grows.
		const depthBeforePush = await historyDepth(page);
		await backButton.click();
		await page.waitForURL((url) => url.pathname === TRACES_EXPLORER_PATH);
		expect(urlOf(page).searchParams.has('selectedExplorerView')).toBe(false);
		expect(await historyDepth(page)).toBe(depthBeforePush + 1);

		// That push is itself the in-app history this hook counts. Return to the
		// trace page by POP — same document, so the counter survives.
		await page.goBack();
		await page.waitForURL((url) => url.pathname === `/trace/${trace.traceId}`);
		await expect(
			page.getByTestId(`cell-0-${trace.landmarks.root}`),
		).toBeVisible();

		// Now the button takes the other branch: `goBack()`, which adds no entry
		// and lands on whatever preceded the trace page.
		const depthBeforePop = await historyDepth(page);
		await backButton.click();
		await page.waitForURL((url) => url.pathname === SERVICES_PATH);
		expect(await historyDepth(page)).toBe(depthBeforePop);
	});

	test('TC-07 re-selecting the current relative time adds no history entry', async ({
		authedPage: page,
	}) => {
		// A page load plus a popover round trip — more than the default budget once
		// the suite saturates the machine's workers.
		test.slow();

		await gotoK8sList(page, 'category=pods&relativeTime=30m');
		await expect(timePicker(page)).toHaveAccessibleName(relativeTimeLabel('30m'));

		const before = urlOf(page);
		const depthBefore = await historyDepth(page);

		await selectRelativeTime(page, '30m');

		// `areUrlsEffectivelySame` ignores the regenerated compositeQuery `id`, so
		// `preventSameUrlNavigation` must swallow this entirely.
		expect(await historyDepth(page)).toBe(depthBefore);
		const after = urlOf(page);
		expect(after.pathname).toBe(K8S_LIST_PATH);
		expect(after.searchParams.get('relativeTime')).toBe('30m');
		expect(after.searchParams.get('category')).toBe(
			before.searchParams.get('category'),
		);
		await expect(timePicker(page)).toHaveAccessibleName(relativeTimeLabel('30m'));

		// The unchanged depth above is the whole property. This deliberately does
		// not go on to assert "one Back leaves the page": the k8s list pushes its
		// own compositeQuery rewrite on mount and pushes it again on the way back,
		// so no fixed number of Backs ever leaves it — a property of that page, not
		// of the router.
	});

	test('TC-08 modifier-clicking an in-app link opens the same url in a new tab', async ({
		authedPage: page,
	}) => {
		const listSearch = `search=${DASHBOARD_TITLE}&columnKey=updatedAt&order=descend&page=1`;
		await page.goto(`${DASHBOARDS_LIST_PATH}?${listSearch}`);

		const row = dashboardRowByTitle(page, DASHBOARD_TITLE);
		await expect(row).toBeVisible();

		const newPage = await openInNewTabByModifierClick(row);
		try {
			expect(new URL(newPage.url()).pathname).toBe(
				`${DASHBOARDS_LIST_PATH}/${dashboardId}`,
			);
			await expect(newPage.getByTestId('dashboard-title')).toHaveText(
				DASHBOARD_TITLE,
			);
		} finally {
			await newPage.close();
		}

		// The opener stays put, params intact.
		const url = urlOf(page);
		expect(url.pathname).toBe(DASHBOARDS_LIST_PATH);
		expect(url.searchParams.get('search')).toBe(DASHBOARD_TITLE);
	});
});
