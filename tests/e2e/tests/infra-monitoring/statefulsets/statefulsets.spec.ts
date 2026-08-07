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
	expressionParams,
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
});
