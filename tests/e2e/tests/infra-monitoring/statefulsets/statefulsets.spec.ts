/**
 * S-* — statefulsets-only. The load-bearing one is the default-visibility
 * asymmetry: `cpu` **and** `memory` are `defaultVisibility: false` here while they
 * are visible on every other workload entity.
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

const STATEFULSETS = entityByKey('statefulsets');

/**
 * One count inside a `pod_replicas` cell.
 *
 * `GroupedStatusCounts` draws current and desired as two sibling spans with no
 * separator between them, so the cell's own text reads as the two digits run
 * together (`35` for current 3 / desired 5). The per-item `data-testid` is the
 * only way to read one count on its own.
 */
function statusCount(cell: Locator, label: string): Locator {
	return cell.getByTestId(`status-count-${label}`);
}

test.describe('statefulsets', () => {
	test('TC-01 Pod Replicas shows current/desired', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		const seeded = await seedDataset(page, 'statefulsets_desired_current');
		await gotoScopedList(page, STATEFULSETS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'pod_replicas')).toBeVisible();

		const name = seeded.names[0];
		const pods = (metric: string): number =>
			fixtureMetric(
				'statefulsets_desired_current',
				STATEFULSETS.nameColumnId,
				name,
				metric,
			);

		const cell = rowFor(page, name).locator('td.tanstack-cell-pod_replicas');
		await expect(statusCount(cell, 'current')).toHaveText(
			String(pods('k8s.statefulset.current_pods')),
		);
		await expect(statusCount(cell, 'desired')).toHaveText(
			String(pods('k8s.statefulset.desired_pods')),
		);
	});

	test('TC-03 Current Pods / Desired Pods are addable, sortable and carry the seeded counts', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		const seeded = await seedDataset(page, 'statefulsets_value_accuracy');
		await gotoScopedList(page, STATEFULSETS, seeded.names);
		await waitForRows(page);

		await openOptionsPanel(page);
		for (const columnId of ['current_pods', 'desired_pods']) {
			await toggleColumn(page, columnId, true);
		}
		await page.keyboard.press('Escape');

		for (const columnId of ['current_pods', 'desired_pods']) {
			await expect(headerCell(page, columnId)).toHaveCount(1);
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}

		// `acc-ss-1` is the row whose current and desired differ, so a column that
		// reads the wrong one of the two fails here.
		const row = rowFor(page, 'acc-ss-1');
		const metricFor: Record<string, string> = {
			current_pods: 'k8s.statefulset.current_pods',
			desired_pods: 'k8s.statefulset.desired_pods',
		};
		for (const columnId of ['current_pods', 'desired_pods']) {
			await expect(
				row.locator(`td.tanstack-cell-${columnId}`),
				columnId,
			).toHaveText(
				String(
					fixtureMetric(
						'statefulsets_value_accuracy',
						STATEFULSETS.nameColumnId,
						'acc-ss-1',
						metricFor[columnId],
					),
				),
			);
		}
	});

	test('TC-05 non-statefulset pods are excluded', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		await seedDataset(page, 'statefulsets_non_ss_pods');

		// Scoped by **namespace**, not by name. `gotoScopedList` writes a backend
		// filter on the very names being asserted, so `keys ⊆ seeded.names` was
		// guaranteed by the query — a pod that wrongly surfaced as a statefulset row
		// would have been filtered out before reaching the table. Scoping by the
		// fixture's namespace keeps the excluded pods inside the query window, which
		// is the only way the exclusion is observable.
		await page.goto(
			listUrl(STATEFULSETS, {
				...expressionParams(`k8s.namespace.name = 'ns-nd'`),
			}),
		);
		await waitForRows(page);

		// `ns-nd` holds one statefulset (`ns-ss`), one deployment (`nd-dep`) and three
		// pods, two of which belong to neither. Only the statefulset is a row here.
		const keys = await renderedRowKeys(page);
		expect(keys, 'the real statefulset is listed').toContain('ns-ss');
		expect(keys, 'a loose pod is not a statefulset row').not.toContain(
			'nd-standalone',
		);
		expect(keys, 'a deployment is not a statefulset row').not.toContain('nd-dep');
	});

	test('TC-06 the same statefulset name across namespaces/clusters stays distinct rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		const seeded = await seedDataset(
			page,
			'statefulsets_same_name_across_ns_and_clusters',
		);
		await gotoScopedList(page, STATEFULSETS, seeded.names);
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
			statusCount(nsYRow.locator('td.tanstack-cell-pod_replicas'), 'desired'),
		).toHaveText(
			String(
				fixtureMetric(
					'statefulsets_same_name_across_ns_and_clusters',
					'k8s.namespace.name',
					'ns-y',
					'k8s.statefulset.desired_pods',
				),
			),
		);
	});
});
