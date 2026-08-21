/**
 * J-* — jobs-only: the `Completions` column, the four job-lifecycle pod counts,
 * and a completed job still listing with its final counts.
 */

import { expect, test } from '../../../fixtures/auth';
import { expectWidgetTitles } from '../../../helpers/infra-monitoring/assertions';
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
	renderedRowKeys,
	resetTableState,
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

	test('J-02 the four lifecycle pod-count columns are addable and sortable', async ({
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

	test('J-04 the Pod Metrics tab renders the 5 utilisation-by-pod widgets', async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		await seedDataset(page, 'jobs_value_accuracy');
		await page.goto(listUrl(JOBS, selectedItemParams(JOBS)));
		await expectDrawerVisible(page);

		await switchDrawerTab(page, 'pod_metrics');
		await expectWidgetTitles(page, POD_METRICS_WIDGET_TITLES);
	});

	test(`J-05 the Metrics tab shows all ${JOBS.widgetTitles.length} job widgets`, async ({
		authedPage: page,
	}) => {
		await resetTableState(page, JOBS);
		await seedDataset(page, 'jobs_value_accuracy');
		await page.goto(listUrl(JOBS, selectedItemParams(JOBS)));
		await expectDrawerVisible(page);

		await expectWidgetTitles(page, JOBS.widgetTitles);
	});
});
