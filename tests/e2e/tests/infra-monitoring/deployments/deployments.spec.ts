/**
 * D-* — deployments-only: `Pod Replicas` available/desired, the Pod Metrics tab,
 * the two addable pod-count columns, and identity across namespaces/clusters.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectedNumber,
	expectedRecord,
} from '../../../helpers/infra-monitoring/datasets';
import { expectDrawerVisible } from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	expressionParams,
	gotoScopedList,
	headerCell,
	listUrl,
	openOptionsPanel,
	renderedRowKeys,
	resetTableState,
	rowFor,
	toggleColumn,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const DEPLOYMENTS = entityByKey('deployments');

test.describe('deployments', () => {
	test('TC-01 Pod Replicas shows available/desired', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(page, 'deployments_desired_available');
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'pod_replicas')).toBeVisible();
		// Rendered as a pair, so the cell carries more than a single figure.
		await expect(
			page.locator('table td.tanstack-cell-pod_replicas').first(),
		).not.toHaveText('');
	});

	test('TC-03 Available Pods / Desired Pods are addable and sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(page, 'deployments_value_accuracy');
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRow(page, DEPLOYMENTS.seed.sampleItemKey);

		for (const columnId of ['available_pods', 'desired_pods']) {
			await expect(headerCell(page, columnId)).toHaveCount(0);
		}

		await openOptionsPanel(page);
		for (const columnId of ['available_pods', 'desired_pods']) {
			await toggleColumn(page, columnId, true);
		}
		await page.keyboard.press('Escape');

		for (const columnId of ['available_pods', 'desired_pods']) {
			await expect(headerCell(page, columnId)).toHaveCount(1);
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}

		// …and the counts, from the integration suite's expectation file rather
		// than invented. Both columns render the bare integer with no unit or
		// separator, so the match is exact. `acc-dep-1` is available 2 of a desired
		// 3, so a mapping that swapped the two accessors fails here. Against a
		// deployment whose two counts are equal, or against the headers alone, it
		// would not.
		const expected = expectedRecord(
			'deployments_value_accuracy',
			'deploymentName',
			DEPLOYMENTS.seed.sampleName,
		);
		const FIELD: Record<string, string> = {
			available_pods: 'availablePods',
			desired_pods: 'desiredPods',
		};
		for (const columnId of ['available_pods', 'desired_pods']) {
			await expect(
				rowFor(page, DEPLOYMENTS.seed.sampleItemKey).locator(
					`td.tanstack-cell-${columnId}`,
				),
				columnId,
			).toHaveText(String(expectedNumber(expected, FIELD[columnId])));
		}
		expect(
			expectedNumber(expected, 'availablePods'),
			'the sample deployment must not have available === desired, or a swap passes',
		).not.toBe(expectedNumber(expected, 'desiredPods'));
	});

	test('TC-04 the same deployment name across namespaces/clusters stays distinct rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(
			page,
			'deployments_same_name_across_ns_and_clusters',
		);
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRows(page);

		// The name is shared, so the rows are only distinguishable by namespace.
		await expect(headerCell(page, 'namespaceName')).toBeVisible();
		expect((await renderedRowKeys(page)).length).toBeGreaterThan(0);
	});

	test('TC-05 pods not owned by a deployment stay out of the roll-up', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		await seedDataset(page, 'deployments_non_deployment_pods');

		// Scoped by **namespace**, not by name. `gotoScopedList` writes a backend
		// filter on the very names being asserted, so `keys ⊆ seeded.names` was
		// guaranteed by the query — a pod that wrongly surfaced as a deployment row
		// would have been filtered out before reaching the table. Scoping by the
		// fixture's namespace keeps the excluded entities inside the query window,
		// which is the only way the exclusion is observable.
		await page.goto(
			listUrl(DEPLOYMENTS, {
				...expressionParams(`k8s.namespace.name = 'ns-nd'`),
			}),
		);
		await waitForRows(page);

		// `ns-nd` holds one deployment (`nd-dep`), one statefulset (`nd-ss`) and three
		// pods, two of which belong to neither. Only the deployment is a row here.
		const keys = await renderedRowKeys(page);
		expect(keys, 'the real deployment is listed').toContain('nd-dep');
		expect(keys, 'a loose pod is not a deployment row').not.toContain(
			'nd-standalone',
		);
		expect(keys, 'a statefulset is not a deployment row').not.toContain('nd-ss');
	});

	test('TC-06 the drawer writes cluster and namespace alongside selectedItem', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(page, 'deployments_value_accuracy');
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRow(page, DEPLOYMENTS.seed.sampleItemKey);
		await rowFor(page, DEPLOYMENTS.seed.sampleItemKey).click();

		// `getK8sDeploymentItemKey` returns all three.
		await expectDrawerVisible(page);
		const params = new URL(page.url()).searchParams;
		expect(params.get('selectedItemClusterName')).toBe(
			DEPLOYMENTS.seed.sampleClusterName,
		);
		expect(params.get('selectedItemNamespaceName')).toBe(
			DEPLOYMENTS.seed.sampleNamespaceName,
		);
	});

	test('TC-07 a deployment missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(page, 'deployments_missing_metrics');
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRows(page);

		// The *specific* cell, matched exactly. `getByText('-')` is a
		// case-insensitive **substring** match and the seeded deployment is called
		// `miss-dep`, so it would be satisfied by the name cell whatever the memory
		// column rendered. `deployments_missing_metrics` seeds only
		// `k8s.pod.cpu.usage`, so the memory roll-up has nothing to sum.
		const memoryCell = rowFor(page, seeded.names[0]).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});
});
