import { dashboardListParams, expect, PATH, test } from '../../drivers/routing';

// Imperative navigation: the `history.listen` counter behind `hasInAppHistory()`,
// `useSafeNavigate`'s same-url suppression, and its `newTab` branch.

test.describe('Routing — imperative navigation', () => {
	test('TC-05 Back from a detail page restores the list with its params', async ({
		routing,
		dashboard,
	}) => {
		await routing.dashboards.gotoList(dashboard.title);
		await routing.dashboards.row(dashboard.title).click();
		await routing.waitForPath(dashboard.path);

		await routing.goBackTo(PATH.dashboards);

		expect(routing.params()).toMatchObject(dashboardListParams(dashboard.title));
	});

	// Both branches of the trace header's Back button in one document:
	// `hasInAppHistory() ? goBack() : push(TRACES_EXPLORER)`.
	test('TC-06 the trace-details previous button pushes when deep-linked and pops once in-app', async ({
		routing,
		largeTrace: trace,
	}) => {
		await routing.goto(PATH.services);
		await routing.trace.goto(trace);

		// The document load reset the counter, so Back pushes the explorer.
		const depthBeforePush = await routing.historyDepth();
		await routing.trace.back();
		await routing.waitForPath(PATH.tracesExplorer);
		expect(routing.url().searchParams.has('selectedExplorerView')).toBe(false);
		expect(await routing.historyDepth()).toBe(depthBeforePush + 1);

		// That push is in-app history, so after a POP back Back pops too.
		await routing.goBackTo(routing.trace.path(trace));
		await expect(routing.trace.rootRow(trace)).toBeVisible();

		const depthBeforePop = await routing.historyDepth();
		await routing.trace.back();
		await routing.waitForPath(PATH.services);
		expect(await routing.historyDepth()).toBe(depthBeforePop);
	});

	test('TC-07 re-selecting the current relative time adds no history entry', async ({
		routing,
	}) => {
		test.slow();

		await routing.k8s.goto({ relativeTime: '30m' });
		await routing.expectRelativeTime('30m');
		const before = routing.params();
		const depthBefore = await routing.historyDepth();

		await routing.selectRelativeTime('30m');

		// `areUrlsEffectivelySame` ignores the regenerated compositeQuery `id`. Not
		// followed by "one Back leaves the page": the k8s list pushes its own
		// compositeQuery rewrite on mount.
		expect(await routing.historyDepth()).toBe(depthBefore);
		expect(routing.url().pathname).toBe(PATH.k8s);
		expect(routing.params()).toMatchObject({
			relativeTime: '30m',
			category: before.category,
		});
		await routing.expectRelativeTime('30m');
	});

	test('TC-08 modifier-clicking an in-app link opens the same url in a new tab', async ({
		routing,
		dashboard,
	}) => {
		await routing.dashboards.gotoList(dashboard.title);

		await routing.inNewTab(
			routing.dashboards.row(dashboard.title),
			async (tab) => {
				expect(tab.url().pathname).toBe(dashboard.path);
				await expect(tab.dashboards.title()).toHaveText(dashboard.title);
			},
		);

		expect(routing.url().pathname).toBe(PATH.dashboards);
		expect(routing.params()).toMatchObject(dashboardListParams(dashboard.title));
	});
});
