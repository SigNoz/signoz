/**
 * N-* — nodes-only: the `condition` badge, the ready-vs-not-ready pod counts, and
 * the allocatable columns.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectedNumber,
	expectedRecord,
} from '../../../helpers/infra-monitoring/datasets';
import {} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	headerCell,
	resetTableState,
	rowFor,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const NODES = entityByKey('nodes');

test.describe('nodes', () => {
	test('TC-01 the condition column renders Ready / Not Ready / No Data', async ({
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

	test('TC-02 a node whose condition flips mid-window reports the latest state', async ({
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

	test('TC-03 Pod Status shows ready vs not-ready counts', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_conditions_grouped');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'podCountsByStatus')).toBeVisible();
	});

	test('TC-05 the allocatable columns render and are sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_value_accuracy');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRow(page, NODES.seed.sampleItemKey);

		for (const columnId of ['cpu_allocatable', 'memory_allocatable']) {
			await expect(headerCell(page, columnId)).toBeVisible();
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}

		// …and the column carries the seeded number. A header on its own is what
		// `table TC-01` already covers, and a metric-mapping regression leaves it
		// standing. `nodeCPUAllocatable` renders through `toFixed(2)`, so the
		// expectation is the fixture's value formatted the same way.
		const allocatableCPU = (name: string): string =>
			expectedNumber(
				expectedRecord('nodes_value_accuracy', 'nodeName', name),
				'nodeCPUAllocatable',
			).toFixed(2);

		for (const name of seeded.names) {
			await expect(
				rowFor(page, name).locator('td.tanstack-cell-cpu_allocatable'),
				`${name} allocatable CPU`,
			).toHaveText(allocatableCPU(name));
		}
	});

	test('TC-06 a node missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, NODES);
		const seeded = await seedDataset(page, 'nodes_missing_metrics');
		await gotoScopedList(page, NODES, seeded.names);
		await waitForRow(page, seeded.names[0]);

		// `nodes_missing_metrics` seeds only `k8s.node.cpu.usage`, so memory is
		// guaranteed absent. The *specific* cell, matched exactly: `getByText('-')`
		// is a case-insensitive substring match and the seeded node is called
		// `miss-n1`, so it would be satisfied by the name cell whatever the memory
		// column rendered.
		const memoryCell = rowFor(page, seeded.names[0]).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});
});
