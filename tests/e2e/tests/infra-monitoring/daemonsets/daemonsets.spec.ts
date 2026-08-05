/**
 * DS-* — daemonsets-only: node-shaped counts instead of pod-shaped ones, and the
 * `cpu`-is-default-hidden asymmetry (memory stays visible, unlike statefulsets).
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
	resetTableState,
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

test.describe('daemonsets', () => {
	test('DS-00 cpu is default-hidden here but memory is not', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		const seeded = await seedDataset(page, 'daemonsets_value_accuracy');
		await gotoScopedList(page, DAEMONSETS, seeded.names);
		await waitForRows(page);

		// The asymmetry differs from statefulsets, where *both* are hidden.
		expect(DAEMONSETS.columns.find((c) => c.id === 'cpu')?.hiddenByDefault).toBe(
			true,
		);
		expect(
			DAEMONSETS.columns.find((c) => c.id === 'memory')?.hiddenByDefault,
		).toBe(false);
		await expect(headerCell(page, 'cpu')).toHaveCount(0);
		await expect(headerCell(page, 'memory')).toHaveCount(1);
		await expectDefaultColumns(page, DAEMONSETS);
	});

	test('DS-01 the Scheduled Nodes column renders', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		const seeded = await seedDataset(page, 'daemonsets_desired_current');
		await gotoScopedList(page, DAEMONSETS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'scheduled_nodes')).toBeVisible();
	});

	test('DS-02 the four node-count columns are addable and sortable', async ({
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
	});

	test('DS-03 the Pod Metrics tab renders the 5 utilisation-by-pod widgets', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		await seedDataset(page, 'daemonsets_value_accuracy');
		await page.goto(listUrl(DAEMONSETS, selectedItemParams(DAEMONSETS)));
		await expectDrawerVisible(page);

		await switchDrawerTab(page, 'pod_metrics');
		await expectWidgetTitles(page, POD_METRICS_WIDGET_TITLES);
	});

	test(`DS-04 the Metrics tab shows all ${DAEMONSETS.widgetTitles.length} daemonset widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, DAEMONSETS);
		await seedDataset(page, 'daemonsets_value_accuracy');
		await page.goto(listUrl(DAEMONSETS, selectedItemParams(DAEMONSETS)));
		await expectDrawerVisible(page);

		await expectWidgetTitles(page, DAEMONSETS.widgetTitles);
	});
});
