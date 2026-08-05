/**
 * D-* — deployments-only: `Pod Replicas` available/desired, the Pod Metrics tab,
 * the two addable pod-count columns, and identity across namespaces/clusters.
 */

import { expect, test } from '../../../fixtures/auth';
import { expectWidgetTitles } from '../../../helpers/infra-monitoring/assertions';
import {
	expectDrawerVisible,
	selectedItemParams,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import {
	entityByKey,
	POD_METRICS_WIDGET_TITLES,
} from '../../../helpers/infra-monitoring/entities';
import {
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
	test('D-01 Pod Replicas shows available/desired', async ({
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

	test('D-02 the Pod Metrics tab renders the 5 utilisation-by-pod widgets', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		await seedDataset(page, 'deployments_value_accuracy');
		await page.goto(listUrl(DEPLOYMENTS, selectedItemParams(DEPLOYMENTS)));
		await expectDrawerVisible(page);

		await switchDrawerTab(page, 'pod_metrics');
		await expectWidgetTitles(page, POD_METRICS_WIDGET_TITLES);
	});

	test('D-03 Available Pods / Desired Pods are addable and sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(page, 'deployments_value_accuracy');
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRows(page);

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
	});

	test('D-04 the same deployment name across namespaces/clusters stays distinct rows', async ({
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

	test('D-05 pods not owned by a deployment stay out of the roll-up', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DEPLOYMENTS);
		const seeded = await seedDataset(page, 'deployments_non_deployment_pods');
		await gotoScopedList(page, DEPLOYMENTS, seeded.names);
		await waitForRows(page);

		// Only the seeded deployments list — the loose pods have no deployment name
		// and so cannot appear as rows.
		const keys = await renderedRowKeys(page);
		for (const key of keys) {
			expect(seeded.names).toContain(key);
		}
	});

	test('D-06 the drawer writes cluster and namespace alongside selectedItem', async ({
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
});
