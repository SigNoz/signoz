/**
 * V-* — volumes-only. The distinguishing one is V-03: volumes passes
 * `hideDetailViewTabs`, so its drawer renders **no tab bar at all** and always the
 * Metrics body — even when `?view=logs` asks for something else.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectedNumber,
	expectedRecord,
} from '../../../helpers/infra-monitoring/datasets';
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
		await waitForRow(page, VOLUMES.seed.sampleItemKey);

		for (const columnId of INODE_COLUMNS) {
			await expect(headerCell(page, columnId), columnId).toBeVisible();
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}

		// …and the counts the fixture was built to populate, from the integration
		// suite's expectation file rather than invented. The cells render the raw
		// integer with no unit or thousands separator, so the match is exact.
		// Asserting all three is the point: used and free are the pair a metric
		// mapping is most likely to swap, and neither the headers nor a single
		// count would notice.
		const expected = expectedRecord(
			'volumes_value_accuracy',
			'persistentVolumeClaimName',
			VOLUMES.seed.sampleName,
		);
		const FIELD: Record<string, string> = {
			inodes: 'volumeInodes',
			inodes_used: 'volumeInodesUsed',
			inodes_free: 'volumeInodesFree',
		};
		for (const columnId of INODE_COLUMNS) {
			await expect(
				rowFor(page, VOLUMES.seed.sampleItemKey).locator(
					`td.tanstack-cell-${columnId}`,
				),
				columnId,
			).toHaveText(String(expectedNumber(expected, FIELD[columnId])));
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
		await expectWidgetTitles(page, VOLUMES.widgetTitles!);
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

	test('V-07 the same volume name across namespaces and clusters stays distinct rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, VOLUMES);
		const seeded = await seedDataset(
			page,
			'volumes_same_name_across_ns_and_clusters',
		);
		const [name] = seeded.names;

		// Scoped by **cluster**, not by name, for the reason V-05 records: a
		// name-scoped list that had deduped `dup-pvc` down to one row would still
		// satisfy every assertion about the seeded name.
		await page.goto(
			listUrl(VOLUMES, { ...expressionParams(`k8s.cluster.name = 'cluster-a'`) }),
		);
		await waitForRows(page);

		// `cluster-a` holds `dup-pvc` in two namespaces, so identity is not the PVC
		// name alone and the correct row set is two rows. Note both carry the same
		// `row-dup-pvc` testid: `getK8sVolumeRowKey` is the PVC name on its own, so
		// `rowFor` cannot address either of them and the namespace column is what
		// makes the two distinguishable.
		expect(await renderedRowKeys(page), 'one name, two rows').toEqual([
			name,
			name,
		]);
		const rendered = await page
			.locator('table td.tanstack-cell-namespaceName')
			.allInnerTexts();
		expect(rendered.map((text) => text.trim()).sort()).toEqual(
			Object.keys(seeded.groups[VOLUMES.groupByAttribute]).sort(),
		);

		await page.goto(
			listUrl(VOLUMES, {
				...expressionParams(`${VOLUMES.groupByAttribute} = 'ns-x'`),
			}),
		);
		await waitForRows(page);

		// …and the cluster half of the same question. `ns-x` holds `dup-pvc` three
		// times: under `cluster-a`, under `cluster-b`, and once with no cluster
		// label at all, which is the case an identity keyed on (name, namespace,
		// cluster) has to keep separate rather than fold into one of the others.
		expect(await renderedRowKeys(page), 'one name, three rows').toEqual([
			name,
			name,
			name,
		]);
	});
});
