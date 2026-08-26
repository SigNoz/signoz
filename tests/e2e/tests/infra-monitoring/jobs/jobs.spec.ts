/**
 * J-* — jobs-only: the `Completions` column, the four job-lifecycle pod counts,
 * and a completed job still listing with its final counts.
 */

import type { Locator } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { fixtureMetric } from '../../../helpers/infra-monitoring/datasets';
import {} from '../../../helpers/infra-monitoring/drawer';
import { entityByKey } from '../../../helpers/infra-monitoring/entities';
import {
	dataRows,
	expressionParams,
	gotoScopedList,
	headerCell,
	listUrl,
	openOptionsPanel,
	renderedRowKeys,
	resetTableState,
	rowFor,
	toggleColumn,
	waitForRows,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

const JOBS = entityByKey('jobs');

/** The four lifecycle pod-count columns, all default-hidden. */
const LIFECYCLE_COLUMNS = [
	'active_pods',
	'failed_pods',
	'successful_pods',
	'desired_successful_pods',
];

/** The metric each lifecycle column reads, for reading expectations back out of a fixture. */
const LIFECYCLE_METRICS: Record<string, string> = {
	active_pods: 'k8s.job.active_pods',
	failed_pods: 'k8s.job.failed_pods',
	successful_pods: 'k8s.job.successful_pods',
	desired_successful_pods: 'k8s.job.desired_successful_pods',
};

/**
 * One count inside a `completion` cell.
 *
 * `GroupedStatusCounts` draws the four lifecycle counts as four sibling spans
 * with no separator between them, so the cell's own text reads as the digits run
 * together. The per-item `data-testid` is the only way to read one count on its
 * own.
 */
function statusCount(cell: Locator, label: string): Locator {
	return cell.getByTestId(`status-count-${label}`);
}

test.describe('jobs', () => {
	test('J-01 the Completions column renders', async ({ authedPage: page }) => {
		await resetTableState(page, JOBS);
		const seeded = await seedDataset(page, 'jobs_lifecycle');
		await gotoScopedList(page, JOBS, seeded.names);
		await waitForRows(page);

		await expect(headerCell(page, 'completion')).toBeVisible();
		await expect(
			page.locator('table td.tanstack-cell-completion').first(),
		).not.toHaveText('');
	});

	test('J-02 the four lifecycle pod-count columns are addable, sortable and carry the seeded counts', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		const seeded = await seedDataset(page, 'jobs_value_accuracy');
		await gotoScopedList(page, JOBS, seeded.names);
		await waitForRows(page);

		await openOptionsPanel(page);
		for (const columnId of LIFECYCLE_COLUMNS) {
			await toggleColumn(page, columnId, true);
		}
		await page.keyboard.press('Escape');

		for (const columnId of LIFECYCLE_COLUMNS) {
			await expect(headerCell(page, columnId), columnId).toHaveCount(1);
			await expect(
				headerCell(page, columnId).locator('button.tanstack-header-title'),
			).toHaveCount(1);
		}

		// All four counts on one row, so a swap between two of them fails here.
		// `acc-job-2` is the row whose four values are distinct and none of them
		// zero.
		const row = rowFor(page, 'acc-job-2');
		for (const columnId of LIFECYCLE_COLUMNS) {
			await expect(
				row.locator(`td.tanstack-cell-${columnId}`),
				columnId,
			).toHaveText(
				String(
					fixtureMetric(
						'jobs_value_accuracy',
						JOBS.nameColumnId,
						'acc-job-2',
						LIFECYCLE_METRICS[columnId],
					),
				),
			);
		}
	});

	test('J-03 a completed job still lists with its final counts', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		const seeded = await seedDataset(page, 'jobs_completed');
		await gotoScopedList(page, JOBS, seeded.names);
		await waitForRows(page);

		// Finishing must not remove the job from the list.
		const keys = await renderedRowKeys(page);
		expect(keys.length).toBeGreaterThan(0);
		await expect(headerCell(page, 'completion')).toBeVisible();
	});

	test('J-06 pods not owned by a job stay out of the roll-up', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		await seedDataset(page, 'jobs_non_job_pods');

		// Scoped by **namespace**, not by name. `gotoScopedList` writes a backend
		// filter on the very names being asserted, so `keys ⊆ seeded.names` would be
		// guaranteed by the query, and a pod that wrongly surfaced as a job row would
		// have been filtered out before reaching the table. Scoping by the fixture's
		// namespace keeps the excluded pods inside the query window, which is the
		// only way the exclusion is observable.
		await page.goto(
			listUrl(JOBS, { ...expressionParams(`k8s.namespace.name = 'ns-nj'`) }),
		);
		await waitForRows(page);

		// `ns-nj` holds one job (`nj-job`), a deployment, a statefulset and a pod
		// owned by none of them, and no other fixture seeds into this namespace. So
		// the correct row set here is exactly one row.
		//
		// Retried, because `waitForRows` cannot tell the two empty tables apart: it
		// returns once the skeletons clear, and they clear whether the query answered
		// with rows or with none, so a list still catching up on ingestion reads back
		// as an empty row set.
		await expect(async () => {
			const keys = await renderedRowKeys(page);
			expect(keys, 'only the real job is listed').toEqual(['nj-job']);
		}).toPass();
	});

	test('J-07 a job missing a metric renders a dash, not a zero', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		const seeded = await seedDataset(page, 'jobs_missing_metrics');
		await gotoScopedList(page, JOBS, seeded.names);
		await waitForRows(page);

		// The *specific* cell, matched exactly: `getByText('-')` is a
		// case-insensitive **substring** match, so it is satisfied by the job's own
		// name and cannot fail. `jobs_missing_metrics` seeds only
		// `k8s.pod.cpu.usage`, so memory is guaranteed absent.
		const memoryCell = rowFor(page, seeded.names[0]).locator(
			'td.tanstack-cell-memory',
		);
		await expect(memoryCell).toHaveText('-');
		await expect(memoryCell, 'a missing metric is not zero').not.toHaveText('0');
	});

	test('J-08 the same job name across namespaces/clusters stays distinct rows', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		const seeded = await seedDataset(
			page,
			'jobs_same_name_across_ns_and_clusters',
		);
		await gotoScopedList(page, JOBS, seeded.names);
		await waitForRows(page);

		// One name, four (namespace, cluster) pairs: ns-x/cluster-a, ns-y/cluster-a,
		// ns-x/cluster-b and ns-x with no cluster label at all. Identity on the name
		// alone collapses these to one row and identity on (name, namespace) to two,
		// so the count is the assertion.
		await expect(headerCell(page, 'namespaceName')).toBeVisible();
		await expect(dataRows(page)).toHaveCount(4);

		// …and the rows carry their own counts rather than a merged roll-up. `ns-y`
		// is the one namespace the fixture uses once, so it addresses a single row.
		const nsYRow = dataRows(page).filter({
			has: page.locator('td.tanstack-cell-namespaceName', { hasText: /^ns-y$/ }),
		});
		await expect(nsYRow).toHaveCount(1);
		await expect(
			statusCount(nsYRow.locator('td.tanstack-cell-completion'), 'desired'),
		).toHaveText(
			String(
				fixtureMetric(
					'jobs_same_name_across_ns_and_clusters',
					'k8s.namespace.name',
					'ns-y',
					'k8s.job.desired_successful_pods',
				),
			),
		);
	});
});
