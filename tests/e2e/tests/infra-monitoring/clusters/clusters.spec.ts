/**
 * C-* — clusters-only: six counts cards, the `nodeCountsByReadiness` column, and
 * the pod-phase roll-up.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	countCard,
	countCardNavLink,
	expectDrawerVisible,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	headerCell,
	listUrl,
	resetTableState,
	rowFor,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const CLUSTERS = entityByKey('clusters');

test.describe('clusters', () => {
	test(`C-01 the drawer shows all ${CLUSTERS.countsCards!.length} count cards with working nav links`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, CLUSTERS);
		await seedDataset(page, 'clusters_value_accuracy');
		await page.goto(listUrl(CLUSTERS, selectedItemParams(CLUSTERS)));
		await expectDrawerVisible(page);

		// The counts section belongs to the tab body, which mounts after the drawer
		// shell — wait for it before iterating, or the first card is "not attached" on a
		// drawer that is still loading.
		await expect(countCard(page, CLUSTERS.countsCards![0])).toBeAttached({
			timeout: 30_000,
		});

		// Six cards do not fit the drawer's counts row at once, so the later ones are
		// scrolled out of view — attached with a real href is the contract, visibility
		// is a function of the viewport.
		for (const label of CLUSTERS.countsCards!) {
			await expect(countCard(page, label), `${label} card`).toBeAttached();
			await expect(
				countCardNavLink(page, label),
				`${label} nav link`,
			).toHaveAttribute('href', new RegExp(`category=${label.toLowerCase()}`));
		}
		// The first card is on-screen without scrolling.
		await expect(countCard(page, CLUSTERS.countsCards![0])).toBeVisible();
	});

	test('C-02 the Node Readiness column renders', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, CLUSTERS);
		const seeded = await seedDataset(page, 'clusters_node_readiness');
		await gotoScopedList(page, CLUSTERS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'nodeCountsByReadiness')).toBeVisible();
	});

	test('C-04 pod phases roll up into the Pod Status column', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, CLUSTERS);
		const seeded = await seedDataset(page, 'clusters_pod_phases');
		await gotoScopedList(page, CLUSTERS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'podCountsByStatus')).toBeVisible();
		// The roll-up renders counts, not raw phase names.
		await expect(page.locator('table').getByText(/\d/).first()).toBeVisible();
	});

	test('C-05 a cluster missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, CLUSTERS);
		const seeded = await seedDataset(page, 'clusters_missing_metrics');
		await gotoScopedList(page, CLUSTERS, seeded.names);
		await waitForRow(page, seeded.names[0]);

		// `clusters_missing_metrics` seeds one node carrying only
		// `k8s.node.cpu.usage`, so the cluster's memory roll-up has nothing to sum.
		// The *specific* cell, matched exactly: `getByText('-')` is a
		// case-insensitive substring match and the seeded cluster is called
		// `miss-cluster`, so it would be satisfied by the name cell whatever the
		// memory column rendered.
		const memoryCell = rowFor(page, seeded.names[0]).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});
});
