/**
 * P-* — what only pods does. Chiefly: **pods identify rows by UID, not name**
 * (`getK8sPodItemKey` returns `pod.podUID`), so the drawer title shows the name
 * while `selectedItem` and the copy-id button carry the UID.
 */

import { expect, test } from '../../../fixtures/auth';
import {
	expectUrlParams,
	expectWidgetTitles,
} from '../../../helpers/infra-monitoring/assertions';
import {
	drawer,
	expectDrawerVisible,
	openRowDrawer,
	selectedItemParams,
} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	expressionParam,
	groupListBy,
	groupRowFor,
	headerCell,
	listUrl,
	openOptionsPanel,
	resetTableState,
	rowFor,
	toggleColumn,
	waitForRow,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const PODS = entityByKey('pods');

test.describe('pods', () => {
	test('P-01 each pod phase renders its own badge, and no_data renders TextNoData', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_phases');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'podStatus')).toBeVisible();
		// The fixture seeds one pod per phase; at least one recognised phase badge
		// must render rather than raw text.
		await expect(
			page
				.locator('table')
				.getByText(/^(Running|Succeeded|Pending|Failed|Unknown)$/)
				.first(),
		).toBeVisible();
	});

	test('P-02 grouped view shows the per-phase breakdown', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		await seedDataset(page, 'pods_phases_grouped');
		// Scope to this fixture's namespace before grouping: the shared stack holds
		// every other spec's namespaces, so the grouped list has enough group rows to
		// push `ns-mixed` off page one.
		await page.goto(
			listUrl(PODS, {
				compositeQuery: expressionParam(`${PODS.groupByAttribute} = 'ns-mixed'`),
			}),
		);
		await waitForRows(page);

		await groupListBy(page, PODS.groupByAttribute);

		const row = groupRowFor(page, 'ns-mixed');
		await expect(row).toBeVisible();
		// `podCountsByStatus` is `hidden-on-collapse`, so it only exists while grouped.
		await expect(headerCell(page, 'podCountsByStatus')).toHaveCount(1);
	});

	test('P-03 Age renders against the __START_TIME__-rebased seed', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);

		// `seed.ts` resolves the placeholder to ~10 minutes ago, so the age is a
		// small, non-empty duration rather than a dash.
		const ageCell = rowFor(page, PODS.seed.sampleItemKey).locator(
			'td.tanstack-cell-podAge',
		);
		await expect(ageCell).toBeVisible();
		await expect(ageCell).not.toHaveText('');
	});

	test('P-04 the Restarts column renders and is sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'podRestarts')).toBeVisible();
		await expect(
			headerCell(page, 'podRestarts').locator('button.tanstack-header-title'),
		).toHaveCount(1);
	});

	test('P-05 request/limit utilisation renders progress bars', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);

		// `cpu_limit` is visible by default and rendered as a progress bar.
		await expect(headerCell(page, 'cpu_limit')).toBeVisible();
		await expect(
			rowFor(page, PODS.seed.sampleItemKey).getByRole('progressbar').first(),
		).toBeVisible();
	});

	test(`P-06 the Metrics tab shows all ${PODS.widgetTitles.length} pod widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		await seedDataset(page, 'pods_value_accuracy');
		await page.goto(listUrl(PODS, selectedItemParams(PODS)));
		await expectDrawerVisible(page);

		// Includes the four per-container panels.
		await expectWidgetTitles(page, PODS.widgetTitles);
	});

	test('P-07 selectedItem is the pod UID, with no cluster/namespace extras', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);
		await openRowDrawer(page, PODS.seed.sampleItemKey);

		// `getK8sPodItemKey` returns a bare string (the UID), so unlike the workload
		// entities pods writes *no* cluster/namespace params. The plan's P-07 claims
		// the opposite; §3.1 and the source agree with this.
		await expectUrlParams(page, {
			selectedItem: PODS.seed.sampleItemKey,
			selectedItemClusterName: null,
			selectedItemNamespaceName: null,
		});
		// The drawer title shows the *name*, which is not the UID.
		await expect(drawer(page)).toContainText(PODS.seed.sampleName);
		expect(PODS.seed.sampleItemKey).not.toBe(PODS.seed.sampleName);
	});

	test('P-08 a pod missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_missing_metrics');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRows(page);

		// At least one cell renders the no-data marker rather than `0`.
		await expect(page.locator('table').getByText('-').first()).toBeVisible();
	});

	test('P-09 namespace, node and cluster are addable from the options panel', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRows(page);

		for (const columnId of ['namespace', 'node', 'cluster']) {
			await expect(headerCell(page, columnId)).toHaveCount(0);
		}

		await openOptionsPanel(page);
		for (const columnId of ['namespace', 'node', 'cluster']) {
			await toggleColumn(page, columnId, true);
		}
		await page.keyboard.press('Escape');

		for (const columnId of ['namespace', 'node', 'cluster']) {
			await expect(headerCell(page, columnId)).toHaveCount(1);
		}
		// And they carry the seeded values.
		await expect(
			rowFor(page, PODS.seed.sampleItemKey).locator('td.tanstack-cell-cluster'),
		).toContainText('cluster-x');
	});
});
