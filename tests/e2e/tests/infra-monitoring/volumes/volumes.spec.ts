/**
 * V-* — volumes-only. The distinguishing one is V-03: volumes passes
 * `hideDetailViewTabs`, so its drawer renders **no tab bar at all** and always the
 * Metrics body — even when `?view=logs` asks for something else.
 */

import { expect, test } from '../../../fixtures/auth';
import { expectWidgetTitles } from '../../../helpers/infra-monitoring/assertions';
import {
	expectDrawerVisible,
	selectedItemParams,
	tabBar,
} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	headerCell,
	listUrl,
	renderedRowKeys,
	resetTableState,
	rowFor,
	resizeColumn,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const VOLUMES = entityByKey('volumes');

/** The three inode columns, all default-visible and sortable. */
const INODE_COLUMNS = ['inodes', 'inodesUsed', 'inodesFree'];

test.describe('volumes', () => {
	test('V-01 the Used column renders a progress bar from the usage formula', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		const seeded = await seedDataset(page, 'volumes_usage_formula');
		await gotoScopedList(page, VOLUMES, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'usage')).toBeVisible();
		// `usage` is `formatBytes(row.volumeUsage)` — plain text, not a bar. Volumes is
		// the one entity whose table draws no `EntityProgressBar` at all (pods,
		// deployments, statefulsets, daemonsets and jobs do), so the plan's "drawn as a
		// bar" was wrong. Assert the byte-formatted value instead.
		await expect(
			page
				.locator('table')
				.getByText(/^\d+(\.\d+)?\s?(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/i)
				.first(),
		).toBeVisible();
	});

	test('V-02 the three inode columns render and are sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		const seeded = await seedDataset(page, 'volumes_value_accuracy');
		await gotoScopedList(page, VOLUMES, seeded.names);
		await waitForRows(page);

		for (const columnId of INODE_COLUMNS) {
			await expect(headerCell(page, columnId), columnId).toBeVisible();
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}
	});

	test('V-03 the drawer renders no tab bar, even with ?view=logs', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		await seedDataset(page, 'volumes_value_accuracy');
		await page.goto(
			listUrl(VOLUMES, { ...selectedItemParams(VOLUMES), view: 'logs' }),
		);
		await expectDrawerVisible(page);

		// `hideDetailViewTabs` — no bar, and `effectiveView` is pinned to metrics.
		await expect(tabBar(page)).toHaveCount(0);
		await expectWidgetTitles(page, VOLUMES.widgetTitles);
	});

	test(`V-04 the Metrics tab shows all ${VOLUMES.widgetTitles.length} volume widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		await seedDataset(page, 'volumes_value_accuracy');
		await page.goto(listUrl(VOLUMES, selectedItemParams(VOLUMES)));
		await expectDrawerVisible(page);

		await expectWidgetTitles(page, VOLUMES.widgetTitles);
	});

	test('V-05 non-PVC volumes are excluded', async ({ authedPage: page }) => {
		await resetTableState(page, VOLUMES);
		const seeded = await seedDataset(page, 'volumes_non_pvc_volume');
		await gotoScopedList(page, VOLUMES, seeded.names);
		await waitForRows(page);

		// Only rows carrying a PVC name can appear.
		for (const key of await renderedRowKeys(page)) {
			expect(seeded.names).toContain(key);
		}
	});

	test('V-06 a formula with a missing operand renders a dash, not a crash', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		const seeded = await seedDataset(page, 'volumes_formula_operand_missing');
		await gotoScopedList(page, VOLUMES, seeded.names);
		await waitForRows(page);

		// The row still renders, with the uncomputable cell showing the no-data marker.
		await expect(headerCell(page, 'usage')).toBeVisible();
		await expect(page.locator('table').getByText('-').first()).toBeVisible();

		// And the table is still interactive afterwards.
		await waitForRow(page, seeded.names[0]);
		await expect(rowFor(page, seeded.names[0])).toBeVisible();
		await resizeColumn(page, 'capacity', 60);
	});
});
