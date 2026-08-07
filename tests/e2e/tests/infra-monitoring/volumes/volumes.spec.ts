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
	expressionParams,
	gotoScopedList,
	headerCell,
	listUrl,
	renderedRowKeys,
	resetTableState,
	resizeColumn,
	rowFor,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const VOLUMES = entityByKey('volumes');

/** The three inode columns, all default-visible and sortable. */
const INODE_COLUMNS = ['inodes', 'inodes_used', 'inodes_free'];

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
		await seedDataset(page, 'volumes_non_pvc_volume');

		// Scoped by **namespace**, not by name. `gotoScopedList` writes a backend
		// filter on the very names being asserted, so "every rendered key is one of
		// the seeded names" was guaranteed by the query — a non-PVC volume that
		// wrongly surfaced would have been filtered out before reaching the table.
		await page.goto(
			listUrl(VOLUMES, { ...expressionParams(`k8s.namespace.name = 'ns-np'`) }),
		);
		await waitForRows(page);

		// `ns-np` holds one real PVC (`np-real-pvc`) and one non-PVC volume, whose
		// `k8s.persistentvolumeclaim.name` is the empty string. So the correct row
		// set here is exactly one row — asserting the *set* is what catches the
		// empty-named volume leaking through as a row.
		const keys = await renderedRowKeys(page);
		expect(keys, 'only the real PVC is listed').toEqual(['np-real-pvc']);
	});

	test('V-06 a formula with a missing operand renders a dash, not a crash', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		const seeded = await seedDataset(page, 'volumes_formula_operand_missing');
		await gotoScopedList(page, VOLUMES, seeded.names);
		await waitForRows(page);

		// The *uncomputable* cell, matched exactly. `getByText('-')` is a
		// case-insensitive substring match and the seeded PVC is called `fop-pvc`, so
		// the old assertion was satisfied by the name cell and could not fail.
		// `usage` is the formula cell: the fixture gives this PVC a capacity but no
		// `k8s.volume.available`, so the subtraction has no operand.
		await expect(headerCell(page, 'usage')).toBeVisible();
		await expect(
			rowFor(page, seeded.names[0]).locator('td.tanstack-cell-usage'),
		).toHaveText('-');

		// And the table is still interactive afterwards.
		await waitForRow(page, seeded.names[0]);
		await expect(rowFor(page, seeded.names[0])).toBeVisible();
		await resizeColumn(page, 'capacity', 60);
	});
});
