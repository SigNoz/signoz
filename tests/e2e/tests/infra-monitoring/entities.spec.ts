import {
	DRAWER_TAB,
	entityByKey,
	expect,
	seedDataset,
	test,
} from '../../drivers/infra';

// What is genuinely per-entity and genuinely needs a browser.
//
// Value accuracy, ownership roll-ups, name distinctness across namespaces and
// latest-wins state are asserted per entity, headless, by the integration suite
// — `test_<entity>_accuracy`, `test_<entity>_base_filter_drops_non_<entity>_pods`,
// `same_name_across_ns_and_clusters`, `test_pods_status_latest_wins`. Repeating
// them through a rendered table adds a ClickHouse round trip and no signal.
//
// What is left is the handful of surfaces that exist on some entities and not
// others: the hosts route and its status filter, the counts cards that navigate,
// and the Pod Metrics tab.

const HOSTS = entityByKey('hosts');
const CLUSTERS = entityByKey('clusters');
const DEPLOYMENTS = entityByKey('deployments');

test.describe('infra monitoring — per-entity surfaces', () => {
	test('TC-01 hosts renders on its own route, with no category rail', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, HOSTS.seed.primary);
		await infra.list.gotoScoped(HOSTS, facts.names);
		const table = infra.list.table(HOSTS);
		await table.waitForRows();

		expect(new URL(page.url()).pathname).toBe(HOSTS.route);
		await expect(infra.list.categoryTabs()).toHaveCount(0);
		expect(await table.rowKeys()).toEqual(
			expect.arrayContaining([HOSTS.seed.sampleItemKey]),
		);
	});

	test('TC-02 the hosts status filter narrows the list', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, HOSTS.seed.primary);
		await infra.list.gotoScoped(HOSTS, facts.names);
		await infra.list.table(HOSTS).waitForRows();

		// The toggle group is hosts-only; every other entity filters through the
		// expression editor alone.
		await infra.list.statusFilter('inactive').click();

		await expect(async () => {
			expect(new URL(page.url()).search).toContain('inactive');
		}).toPass();
	});

	test('TC-03 a counts card navigates to the entity it counts', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, CLUSTERS.seed.primary);
		await infra.list.goto(CLUSTERS, infra.drawer.selectedItemParams(CLUSTERS));
		await infra.drawer.expectBodyReady();

		const card = infra.drawer.countCard('Nodes');
		await expect(card).toBeVisible();
		await infra.drawer.countCardNavLink('Nodes').click();

		// The card is a link into the nodes list, scoped to this cluster.
		await expect(page).toHaveURL(/category=nodes/);
	});

	test('TC-04 the Pod Metrics tab renders for the entities that have it', async ({
		authedPage: page,
		infra,
	}) => {
		await seedDataset(page, DEPLOYMENTS.seed.primary);
		await infra.list.goto(
			DEPLOYMENTS,
			infra.drawer.selectedItemParams(DEPLOYMENTS),
		);
		await infra.drawer.expectBodyReady();

		expect(await infra.drawer.renderedViews()).toContain(DRAWER_TAB.podMetrics);

		await infra.drawer.switchTab(DRAWER_TAB.podMetrics);
		await expect(infra.drawer.charts().first()).toBeVisible();
	});
});
