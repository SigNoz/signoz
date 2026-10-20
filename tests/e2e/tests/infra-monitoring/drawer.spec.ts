import {
	BASE_ENTITY,
	DRAWER_TAB,
	entityByKey,
	EXPLORER_LINK,
	expect,
	seedDataset,
	test,
} from '../../drivers/infra';

// The entity-details drawer: how it opens, what the URL says about it, and the
// two things only a browser can show — its own time range, and the cross-page
// links out of it.

const VOLUMES = entityByKey('volumes');

test.describe('infra monitoring — drawer', () => {
	test('TC-01 a row click opens the drawer and writes selectedItem', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		await infra.list.table(BASE_ENTITY).waitForRows();

		await infra.drawer.open(BASE_ENTITY.seed.sampleItemKey);
		await infra.drawer.expectBodyReady();

		await infra.list.expectUrlParams({
			selectedItem: BASE_ENTITY.seed.sampleItemKey,
		});
		await expect(infra.drawer.title()).toContainText(BASE_ENTITY.seed.sampleName);

		await infra.drawer.close();
		await infra.list.expectUrlParams({ selectedItem: null });
	});

	test('TC-02 a deep link opens the drawer without the list being touched', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(
			BASE_ENTITY,
			infra.drawer.selectedItemParams(BASE_ENTITY),
		);

		await infra.drawer.expectBodyReady();
		await expect(infra.drawer.title()).toContainText(BASE_ENTITY.seed.sampleName);
	});

	test('TC-03 the drawer opens on Overview and the tab bar writes view', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(
			BASE_ENTITY,
			infra.drawer.selectedItemParams(BASE_ENTITY),
		);
		await infra.drawer.expectBodyReady();

		// The bar is the authority on what an entity offers; the registry only
		// records whether it has one at all.
		const views = await infra.drawer.renderedViews();
		expect(views[0]).toBe(DRAWER_TAB.overview);
		expect(views).toContain(DRAWER_TAB.metrics);
		expect(infra.drawer.viewFromUrl()).toBeNull();

		await infra.drawer.switchTab(DRAWER_TAB.logs);
		await infra.list.expectUrlParams({ view: DRAWER_TAB.logs });

		await infra.drawer.switchTab(DRAWER_TAB.metrics);
		await infra.list.expectUrlParams({ view: DRAWER_TAB.metrics });
	});

	test('TC-04 volumes has no tab bar but still renders the metrics body', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, VOLUMES.seed.primary);
		await infra.list.goto(VOLUMES, infra.drawer.selectedItemParams(VOLUMES));

		// The body wait is what makes this absence assertion mean anything: before
		// it, the tab bar has simply not mounted yet and the check passes for the
		// wrong reason.
		await infra.drawer.expectBodyReady();
		await expect(infra.drawer.tabBar()).toHaveCount(0);
		await expect(infra.drawer.timePicker()).toBeVisible();
	});

	test('TC-05 the drawer keeps its own time range and can reset to the list', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(
			BASE_ENTITY,
			infra.drawer.selectedItemParams(BASE_ENTITY),
		);
		await infra.drawer.expectBodyReady();

		expect(infra.drawer.timeParams().relative).toBeNull();
		const listRange = new URL(page.url()).searchParams.get('relativeTime');

		await infra.drawer.setTime('Last 1 hour');
		expect(infra.drawer.timeParams().relative).not.toBeNull();
		// The list's own range is a different set of params and must not move.
		await infra.list.expectUrlParams({ relativeTime: listRange });

		await infra.drawer.resetTimeToList();
		expect(infra.drawer.timeParams().relative).toBeNull();
	});

	test('TC-06 the compass opens the logs explorer in a new tab and keeps the drawer', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.goto(
			BASE_ENTITY,
			infra.drawer.selectedItemParams(BASE_ENTITY),
		);
		await infra.drawer.expectBodyReady();
		await infra.drawer.switchTab(DRAWER_TAB.logs);

		const explorer = await infra.drawer.openExplorer(EXPLORER_LINK.logs);
		expect(new URL(explorer.url()).pathname).toMatch(/logs-explorer/);
		expect(
			new URL(explorer.url()).searchParams.get('compositeQuery'),
		).toBeTruthy();
		await explorer.close();

		await expect(infra.drawer.panel()).toBeVisible();
	});

	test('TC-07 a drawer opened in a new tab carries its identity', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);
		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		await infra.list.table(BASE_ENTITY).waitForRows();

		const opened = await infra.drawer.openInNewTab(
			BASE_ENTITY.seed.sampleItemKey,
		);

		expect(new URL(opened.url()).searchParams.get('selectedItem')).toBe(
			BASE_ENTITY.seed.sampleItemKey,
		);
		await opened.close();
	});
});
