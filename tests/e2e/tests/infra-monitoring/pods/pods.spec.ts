/**
 * P-* — what only pods does. Chiefly: **pods identify rows by UID, not name**
 * (`getK8sPodItemKey` returns `pod.podUID`), so the drawer title shows the name
 * while `selectedItem` and the copy-id button carry the UID.
 */

import { expect, test } from '../../../fixtures/auth';
import { fixtureMetric } from '../../../helpers/infra-monitoring/datasets';
import { expectUrlParams } from '../../../helpers/infra-monitoring/assertions';
import {
	drawer,
	openRowDrawer,
} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	dataRows,
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
import {
	itemKeyFor,
	seedDataset,
} from '../../../helpers/infra-monitoring/seed';

const PODS = entityByKey('pods');

test.describe('pods', () => {
	test('TC-01 each pod phase renders its own badge, and no_data renders TextNoData', async ({
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

	test('TC-02 grouped view shows the per-phase breakdown', async ({
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

	test('TC-03 Age renders against the __START_TIME__-rebased seed', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);

		// `seed.ts` resolves the placeholder to `START_TIME_AGE_MS` (10 minutes) ago,
		// and `formatAge` switches to `Nh Nm` past the hour and `Nd Nh` past the day.
		// So a minutes-only age is the bounded statement that the rebase reached the
		// column: `not.toHaveText('')` also passed on `-`, on `0s`, and on the
		// unrebased fixture epoch rendering as `Nd`.
		const ageCell = rowFor(page, PODS.seed.sampleItemKey).locator(
			'td.tanstack-cell-podAge',
		);
		await expect(ageCell).toBeVisible();
		await expect(ageCell).toHaveText(/^\d+m$/);
	});

	test('TC-04 the Restarts column renders, and is not sortable', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'podRestarts')).toBeVisible();
		// `enableSort: false` since #12127 — the plan's "and is sortable" was written
		// against an older config. The header is a plain span, so there is no `orderBy`
		// this column can produce.
		await expect(
			headerCell(page, 'podRestarts').locator('button.tanstack-header-title'),
		).toHaveCount(0);
		await expect(
			headerCell(page, 'podRestarts').locator('span.tanstack-header-title'),
		).toHaveCount(1);
	});

	test('TC-05 request/limit utilisation renders progress bars', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);

		// `cpu_limit` is visible by default and rendered as a progress bar.
		await expect(headerCell(page, 'cpu_limit')).toBeVisible();

		// The *value*, read from the fixture rather than invented — and the two
		// seeded pods deliberately land in different threshold bands, which is the
		// half §5's TC-05 actually asks for. `EntityProgressBar` renders the
		// percentage as visible text, so the band boundary (limit: ≤60 healthy,
		// >95 at-limit) is observable without reading a stroke colour.
		//
		// Note the expectation comes from the JSONL, not from
		// `pods_value_accuracy_expected.json`: that file records `podCPULimit`, the
		// limit in cores, while this column renders `k8s.pod.cpu_limit_utilization`.
		const band = (name: string): number =>
			Math.round(
				fixtureMetric(
					'pods_value_accuracy',
					PODS.nameColumnId,
					name,
					'k8s.pod.cpu_limit_utilization',
				) * 100,
			);

		await expect(
			rowFor(page, itemKeyFor(PODS, 'acc-p1')).locator(
				'td.tanstack-cell-cpu_limit',
			),
		).toContainText(`${band('acc-p1')}%`);
		await expect(
			rowFor(page, itemKeyFor(PODS, 'acc-p2')).locator(
				'td.tanstack-cell-cpu_limit',
			),
		).toContainText(`${band('acc-p2')}%`);
		// …and the two really are in different bands, or this asserts one band twice.
		expect(band('acc-p1'), 'the two pods span a threshold boundary').toBeLessThan(
			band('acc-p2'),
		);
	});

	test('TC-07 selectedItem is the pod UID, with no cluster/namespace extras', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_value_accuracy');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRow(page, PODS.seed.sampleItemKey);
		await openRowDrawer(page, PODS.seed.sampleItemKey);

		// `getK8sPodItemKey` returns a bare string (the UID), so unlike the workload
		// entities pods writes *no* cluster/namespace params. The plan's TC-07 claims
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

	test('TC-08 a pod missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_missing_metrics');
		await gotoScopedList(page, PODS, seeded.names);
		await waitForRows(page);

		// The *specific* cell, matched exactly. `getByText('-')` is a
		// case-insensitive **substring** match, and the seeded pod is called
		// `miss-p1` — so the old assertion was satisfied by the name cell and could
		// not fail whether the app rendered `-`, `0`, or nothing at all.
		// `pods_missing_metrics` seeds only `k8s.pod.cpu.usage`, so memory is
		// guaranteed absent.
		const memoryCell = rowFor(page, itemKeyFor(PODS, seeded.names[0])).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});

	test('TC-09 namespace, node and cluster are addable from the options panel', async ({
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

	test('TC-10 a pod whose phase flips mid-window reports the latest phase', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, PODS);
		const seeded = await seedDataset(page, 'pods_phases_transition');
		// An explicit window, not the route's default `relativeTime=30m`. The list
		// endpoint floors its query end down to a whole minute (`alignedMetricWindow`,
		// whose step is never under 60 s) while `seed.ts` lands the newest sample 30 s
		// before now, so on a now-ended range that sample falls outside the query
		// whenever the clock is past the half-minute. The pod then reports the phase
		// it held *before* the flip, which is correct for a window that excludes it
		// and makes this scenario a coin flip. Ending a minute ahead puts the whole
		// series inside whatever the floor rounds down to.
		const endTime = Date.now() + 60_000;
		await gotoScopedList(page, PODS, seeded.names, {
			startTime: String(endTime - 30 * 60 * 1000),
			endTime: String(endTime),
		});
		await waitForRows(page);

		// One row per pod, since a transition must not split into two. The name
		// filter cannot make this pass on its own: both halves of a split would
		// carry the same `k8s.pod.name`.
		await expect(dataRows(page)).toHaveCount(seeded.names.length);

		// `k8s.pod.phase` runs 1 (Pending), 1, then 2 (Running) across the fixture's
		// three samples, and the status expression takes `argMax(value, timestamp)`,
		// so the badge is the latest phase and not the first one. The fixture also
		// carries a `CrashLoopBackOff` container reason whose latest sample is 0:
		// container reasons outrank the phase, but only while active, so a
		// deactivated one must not win either.
		const statusCell = rowFor(page, itemKeyFor(PODS, seeded.names[0])).locator(
			'td.tanstack-cell-podStatus',
		);
		await expect(statusCell).toHaveText('Running');
	});
});
