/**
 * S-* — statefulsets-only. The load-bearing one is the default-visibility
 * asymmetry: `cpu` **and** `memory` are `defaultVisibility: false` here while they
 * are visible on every other workload entity.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectDefaultColumns,
	expectWidgetTitles,
} from '../../../helpers/infra-monitoring/assertions';
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
	toggleColumn,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const STATEFULSETS = entityByKey('statefulsets');

test.describe('statefulsets', () => {
	test('S-00 cpu and memory are default-hidden here, unlike every other workload', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		const seeded = await seedDataset(page, 'statefulsets_value_accuracy');
		await gotoScopedList(page, STATEFULSETS, seeded.names);
		await waitForRows(page);

		// The registry records the asymmetry; this is what makes a refactor that
		// "tidies" it up fail loudly.
		for (const columnId of ['cpu', 'memory']) {
			expect(
				STATEFULSETS.columns.find((c) => c.id === columnId)?.hiddenByDefault,
				`${columnId} is registered as hidden`,
			).toBe(true);
			await expect(headerCell(page, columnId)).toHaveCount(0);
		}
		await expectDefaultColumns(page, STATEFULSETS);
	});

	test('S-01 Pod Replicas shows current/desired', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		const seeded = await seedDataset(page, 'statefulsets_desired_current');
		await gotoScopedList(page, STATEFULSETS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'pod_replicas')).toBeVisible();
		await expect(
			page.locator('table td.tanstack-cell-pod_replicas').first(),
		).not.toHaveText('');
	});

	test('S-02 the Pod Metrics tab renders the 5 utilisation-by-pod widgets', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		await seedDataset(page, 'statefulsets_value_accuracy');
		await page.goto(listUrl(STATEFULSETS, selectedItemParams(STATEFULSETS)));
		await expectDrawerVisible(page);

		await switchDrawerTab(page, 'pod_metrics');
		await expectWidgetTitles(page, POD_METRICS_WIDGET_TITLES);
	});

	test('S-03 Current Pods / Desired Pods are addable and sortable', async ({
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
	});

	test(`S-04 the Metrics tab shows all ${STATEFULSETS.widgetTitles.length} statefulset widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		await seedDataset(page, 'statefulsets_value_accuracy');
		await page.goto(listUrl(STATEFULSETS, selectedItemParams(STATEFULSETS)));
		await expectDrawerVisible(page);

		await expectWidgetTitles(page, STATEFULSETS.widgetTitles);
	});

	test('S-05 non-statefulset pods are excluded', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, STATEFULSETS);
		const seeded = await seedDataset(page, 'statefulsets_non_ss_pods');
		await gotoScopedList(page, STATEFULSETS, seeded.names);
		await waitForRows(page);

		for (const key of await renderedRowKeys(page)) {
			expect(seeded.names).toContain(key);
		}
	});
});
