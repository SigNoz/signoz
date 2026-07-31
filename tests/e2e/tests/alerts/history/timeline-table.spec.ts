import { expect, test } from '../../../fixtures/alert-history';
import {
	firstTimelineRowCreatedAt,
	gotoAlertHistory,
	TIMELINE_PAGE_SIZE,
	timelineFooterRange,
	timelineRows,
} from '../../../helpers/alerts';

test.describe('Alert history — timeline table', () => {
	test('AT-01 timeline section renders all chrome elements', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(page.locator('.timeline__title')).toHaveText('Timeline');
		await expect(page.getByTestId('timeline-tab-overall-status')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-all')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-fired')).toBeVisible();
		await expect(page.getByTestId('timeline-filter-resolved')).toBeVisible();
		await expect(page.getByTestId('timeline-graph')).toBeVisible();
		await expect(page.getByTestId('timeline-table')).toBeVisible();
	});

	test('AT-02 Top 5 Contributors tab is disabled with Coming Soon indicator', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const tab = page.getByTestId('timeline-tab-top-contributors');
		await expect(tab).toBeDisabled();
		await expect(tab).toContainText('Coming Soon');
	});

	test('AT-04 table rows display state, labels and formatted timestamp', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(timelineRows(page)).toHaveCount(TIMELINE_PAGE_SIZE);

		const first = timelineRows(page).first();
		await expect(first.getByTestId('timeline-row-state')).toHaveText('Firing');
		await expect(first.getByTestId('timeline-row-labels')).toContainText(
			'service.name',
		);
		await expect(first.getByTestId('timeline-row-created-at')).toHaveText(
			/^[A-Z][a-z]{2} \d{1,2}, \d{4} ⎯ \d{2}:\d{2}:\d{2}$/,
		);
	});

	test('AT-05 footer shows correct row range', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect(timelineFooterRange(page)).toHaveText(
			`1 — ${TIMELINE_PAGE_SIZE} of ${alertHistory.total}`,
		);
	});

	test('AT-14 row click does not navigate away', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		const before = page.url();

		await timelineRows(page).first().click();

		expect(page.url()).toBe(before);
		await expect(page.getByTestId('timeline-table')).toBeVisible();
	});

	test('AT-15 row actions link navigates to logs explorer', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await timelineRows(page).first().getByTestId('timeline-row-actions').click();

		const viewLogs = page.getByTestId('alert-popover-view-logs');
		await expect(viewLogs).toBeVisible();
		await viewLogs.click();

		await expect(page).toHaveURL(/\/logs\/logs-explorer/);
		const search = new URL(page.url()).searchParams;
		expect(search.get('startTime')).toBeTruthy();
		expect(search.get('endTime')).toBeTruthy();
		expect(page.url()).toContain('compositeQuery');
	});

	test('AT-16 metrics rule rows show disabled action (no related links)', async ({
		authedPage: page,
		metricsHistory,
	}) => {
		await gotoAlertHistory(page, metricsHistory.ruleId);

		const action = timelineRows(page).first().getByTestId('timeline-row-actions');
		await expect(action).toBeDisabled();

		await expect(page.getByTestId('alert-popover-view-logs')).toHaveCount(0);
		await expect(page.getByTestId('alert-popover-view-traces')).toHaveCount(0);
	});

	test('AT-17 CREATED AT column respects app timezone setting', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page).first()).toBeVisible();
		const utcCell = await firstTimelineRowCreatedAt(page);

		await page.addInitScript(() =>
			localStorage.setItem('PREFERRED_TIMEZONE', 'Asia/Kolkata'),
		);
		await gotoAlertHistory(page, alertHistory.ruleId);
		await expect(timelineRows(page).first()).toBeVisible();

		expect(await firstTimelineRowCreatedAt(page)).not.toBe(utcCell);
	});

	test('AT-18 state cell renders Firing, Resolved, and No Data correctly', async ({
		authedPage: page,
		resolvedHistory,
		noDataHistory,
	}) => {
		await gotoAlertHistory(page, resolvedHistory.ruleId);
		await expect(timelineRows(page).first()).toBeVisible();
		const stateCells = timelineRows(page).getByTestId('timeline-row-state');
		const labels = [...new Set(await stateCells.allInnerTexts())];
		expect(labels).toContain('Firing');
		expect(labels).toContain('Resolved');

		await gotoAlertHistory(page, noDataHistory.ruleId);
		await expect(
			timelineRows(page).getByTestId('timeline-row-state').first(),
		).toHaveText('No Data');
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AT-18b pending/recovering states render blank (coverage gap)', async () => {
		test.skip(
			true,
			'Needs SEED-D (coverage doc §3.5): `pending` and `recovering` are ' +
				'transient states no cheap fixture produces. AlertState.tsx has no ' +
				'`case` for either, so both hit `default` and the STATE cell renders ' +
				'empty — write this as a bug-catch once the seeder endpoint exists.',
		);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AT-18c disabled state renders as "Muted" (coverage gap)', async () => {
		test.skip(
			true,
			'Needs SEED-D (coverage doc §3.5): a `disabled` history row is ' +
				'policy-driven and the ruler never writes one for a rule we disable ' +
				'(verified: disabling appends no row).',
		);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('AT-20 time-range boundaries inclusive/exclusive (coverage gap)', async () => {
		test.skip(
			true,
			'Needs SEED-D (coverage doc §3.5): asserting a row exactly at `start` ' +
				'and one at `start-1ms` requires controlling the row timestamps, and ' +
				'evaluation times are whatever the ruler chose.',
		);
	});
});
