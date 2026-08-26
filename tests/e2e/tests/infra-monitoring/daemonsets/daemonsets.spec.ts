/**
 * DS-* — daemonsets-only: node-shaped counts instead of pod-shaped ones, and the
 * `cpu`-is-default-hidden asymmetry (memory stays visible, unlike statefulsets).
 */

import type { Locator } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import {} from '../../../helpers/infra-monitoring/assertions';
import { fixtureMetric } from '../../../helpers/infra-monitoring/datasets';
import {} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	dataRows,
	expressionParams,
	gotoScopedList,
	headerCell,
	listUrl,
	openOptionsPanel,
	renderedRowKeys,
	resetTableState,
	rowFor,
	toggleColumn,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const DAEMONSETS = entityByKey('daemonsets');

/** The four node-count columns only daemonsets has, all default-hidden. */
const NODE_COUNT_COLUMNS = [
	'ready_nodes',
	'current_nodes',
	'desired_nodes',
	'misscheduled_nodes',
];

/**
 * One count inside a `scheduled_nodes` cell.
 *
 * `GroupedStatusCounts` draws the four node counts as four sibling spans with no
 * separator between them, so the cell's own text reads as the digits run
 * together (`35` for current 3 / desired 5). The per-item `data-testid` is the
 * only way to read one count on its own.
 */
function statusCount(cell: Locator, label: string): Locator {
	return cell.getByTestId(`status-count-${label}`);
}

test.describe('daemonsets', () => {
	test('DS-01 the Scheduled Nodes column renders current and desired', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		const seeded = await seedDataset(page, 'daemonsets_desired_current');
		await gotoScopedList(page, DAEMONSETS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'scheduled_nodes')).toBeVisible();

		const name = seeded.names[0];
		const nodes = (metric: string): number =>
			fixtureMetric(
				'daemonsets_desired_current',
				DAEMONSETS.nameColumnId,
				name,
				metric,
			);

		// Read per item, never as the cell's own text: the fixture seeds no ready or
		// misscheduled count, the API returns -1 for both, and `GroupedStatusCounts`
		// prints -1 verbatim, so the whole cell reads `-135-1`.
		const cell = rowFor(page, name).locator('td.tanstack-cell-scheduled_nodes');
		await expect(statusCount(cell, 'current')).toHaveText(
			String(nodes('k8s.daemonset.current_scheduled_nodes')),
		);
		await expect(statusCount(cell, 'desired')).toHaveText(
			String(nodes('k8s.daemonset.desired_scheduled_nodes')),
		);
	});

	test('DS-02 the four node-count columns are addable, sortable and carry the seeded counts', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		const seeded = await seedDataset(page, 'daemonsets_value_accuracy');
		await gotoScopedList(page, DAEMONSETS, seeded.names);
		await waitForRows(page);

		await openOptionsPanel(page);
		for (const columnId of NODE_COUNT_COLUMNS) {
			await toggleColumn(page, columnId, true);
		}
		await page.keyboard.press('Escape');

		for (const columnId of NODE_COUNT_COLUMNS) {
			await expect(headerCell(page, columnId), columnId).toHaveCount(1);
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}

		// All four counts on one row, so a swap between two of them fails here.
		// `acc-ds-1` is the row whose four values are not all equal.
		const row = rowFor(page, 'acc-ds-1');
		const metricFor: Record<string, string> = {
			ready_nodes: 'k8s.daemonset.ready_nodes',
			current_nodes: 'k8s.daemonset.current_scheduled_nodes',
			desired_nodes: 'k8s.daemonset.desired_scheduled_nodes',
			misscheduled_nodes: 'k8s.daemonset.misscheduled_nodes',
		};
		for (const columnId of NODE_COUNT_COLUMNS) {
			await expect(
				row.locator(`td.tanstack-cell-${columnId}`),
				columnId,
			).toHaveText(
				String(
					fixtureMetric(
						'daemonsets_value_accuracy',
						DAEMONSETS.nameColumnId,
						'acc-ds-1',
						metricFor[columnId],
					),
				),
			);
		}
	});

	test('DS-05 pods not owned by a daemonset stay out of the roll-up', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		await seedDataset(page, 'daemonsets_non_ds_pods');

		// Scoped by **namespace**, not by name. `gotoScopedList` writes a backend
		// filter on the very names being asserted, so `keys ⊆ seeded.names` would be
		// guaranteed by the query, and a pod that wrongly surfaced as a daemonset row
		// would have been filtered out before reaching the table. Scoping by the
		// fixture's namespace keeps the excluded pods inside the query window, which
		// is the only way the exclusion is observable.
		await page.goto(
			listUrl(DAEMONSETS, {
				...expressionParams(`k8s.namespace.name = 'ns-nd'`),
			}),
		);
		await waitForRows(page);

		// `ns-nd` holds one daemonset (`nd-ds`), a deployment, a statefulset and a
		// pod owned by none of them. `deployments_non_deployment_pods` and
		// `statefulsets_non_ss_pods` share this namespace but seed no daemonset, so
		// the correct row set here is exactly one row whichever specs ran first.
		//
		// Retried, because `waitForRows` cannot tell the two empty tables apart: it
		// returns once the skeletons clear, and they clear whether the query answered
		// with rows or with none, so a list still catching up on ingestion reads back
		// as an empty row set.
		await expect(async () => {
			const keys = await renderedRowKeys(page);
			expect(keys, 'only the real daemonset is listed').toEqual(['nd-ds']);
		}).toPass();
	});

	test('DS-06 the same daemonset name across namespaces/clusters stays distinct rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		const seeded = await seedDataset(
			page,
			'daemonsets_same_name_across_ns_and_clusters',
		);
		await gotoScopedList(page, DAEMONSETS, seeded.names);
		await waitForRows(page);

		// One name, four (namespace, cluster) pairs: ns-x/cluster-a, ns-y/cluster-a,
		// ns-x/cluster-b and ns-x with no cluster label at all. Identity on the name
		// alone collapses these to one row and identity on (name, namespace) to two,
		// so the count is the assertion.
		await expect(headerCell(page, 'namespaceName')).toBeVisible();
		await expect(dataRows(page)).toHaveCount(4);

		// …and the rows carry their own counts rather than a merged roll-up. `ns-y`
		// is the one namespace the fixture uses once, so it addresses a single row.
		const nsYRow = dataRows(page).filter({
			has: page.locator('td.tanstack-cell-namespaceName', { hasText: /^ns-y$/ }),
		});
		await expect(nsYRow).toHaveCount(1);
		await expect(
			statusCount(nsYRow.locator('td.tanstack-cell-scheduled_nodes'), 'desired'),
		).toHaveText(
			String(
				fixtureMetric(
					'daemonsets_same_name_across_ns_and_clusters',
					'k8s.namespace.name',
					'ns-y',
					'k8s.daemonset.desired_scheduled_nodes',
				),
			),
		);
	});
});
