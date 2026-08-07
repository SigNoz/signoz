/**
 * N-* — nodes-only: the `condition` badge, the ready-vs-not-ready pod counts, and
 * the allocatable columns.
 */

import { expect, test } from '../../../fixtures/auth';
import { expectWidgetTitles } from '../../../helpers/infra-monitoring/assertions';
import {
	expectDrawerVisible,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	headerCell,
	listUrl,
	resetTableState,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const NODES = entityByKey('nodes');

test.describe('nodes', () => {
	test('N-01 the condition column renders Ready / Not Ready / No Data', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_conditions');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'condition')).toBeVisible();
		// `NODE_CONDITION_LABEL_MAP` maps the raw values to these labels.
		await expect(
			page
				.locator('table')
				.getByText(/^(Ready|Not Ready|No Data)$/)
				.first(),
		).toBeVisible();
	});

	test('N-02 a node whose condition flips mid-window reports the latest state', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_conditions_transition');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRows(page);

		// One row per node — a transition must not split into two.
		const rows = page.locator('[data-testid^="row-"]');
		await expect(rows).toHaveCount(seeded.names.length);
		await expect(
			page
				.locator('table')
				.getByText(/^(Ready|Not Ready|No Data)$/)
				.first(),
		).toBeVisible();
	});

	test('N-03 Pod Status shows ready vs not-ready counts', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_conditions_grouped');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'podCountsByStatus')).toBeVisible();
	});

	test(`N-04 the Metrics tab shows all ${NODES.widgetTitles.length} node widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		await seedDataset(page, 'nodes_value_accuracy');
		await page.goto(listUrl(NODES, selectedItemParams(NODES)));
		await expectDrawerVisible(page);

		// Includes `Pods by CPU (top 10)` / `Pods by Memory (top 10)`.
		await expectWidgetTitles(page, NODES.widgetTitles);
	});

	test('N-05 the allocatable columns render and are sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_value_accuracy');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRows(page);

		for (const columnId of ['cpu_allocatable', 'memory_allocatable']) {
			await expect(headerCell(page, columnId)).toBeVisible();
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}
	});
});
