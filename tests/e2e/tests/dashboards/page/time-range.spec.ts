import {
	expect,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../drivers/dashboard-settings';

// Scope: the dashboard toolbar's time picker, refresh and auto-refresh.

const HOUR_MS = 60 * 60 * 1000;

test.describe('Dashboards — time range', () => {
	test.beforeEach(async ({ dashboards }) => {
		await dashboards.seedAndOpen(singlePanelDashboard());
	});

	test('TC-01 a preset updates the label, the URL and refetches', async ({
		timePicker,
		queryRange,
		authedPage: page,
	}) => {
		const windows = queryRange.recordWindows();
		await timePicker.selectPreset('1h');

		await expect(timePicker.input()).toHaveAccessibleName('Last 1 hour');
		await expect(page).toHaveURL(/relativeTime=1h/);
		await expect
			.poll(() => windows.some((w) => w.end - w.start === HOUR_MS))
			.toBe(true);
	});

	test('TC-02 a custom date range switches the URL to absolute timestamps', async ({
		timePicker,
		queryRange,
		authedPage: page,
	}) => {
		const windows = queryRange.recordWindows();
		await timePicker.selectPreviousMonthRange(14, 16);

		await expect(timePicker.input()).toHaveValue(
			/^14\/\d{2}\/\d{4} 00:00:00 - 16\/\d{2}\/\d{4} 23:59:59$/,
		);
		await expect(page).toHaveURL(/startTime=\d+/);
		await expect(page).toHaveURL(/endTime=\d+/);
		await expect(page).not.toHaveURL(/relativeTime=/);

		const matchesUrl = (): boolean => {
			const url = new URL(page.url());
			const start = Number(url.searchParams.get('startTime'));
			const end = Number(url.searchParams.get('endTime'));
			return windows.some((w) => w.start === start && w.end === end);
		};
		await expect.poll(matchesUrl).toBe(true);
	});

	test('TC-03 changing the timezone updates the offset badge', async ({
		timePicker,
	}) => {
		await timePicker.selectTimezone('Tokyo', 'Asia/Tokyo');

		await expect(timePicker.timezoneBadge()).toHaveText('UTC + 9:00');
	});

	test('TC-04 auto-refresh refetches the panels on its interval, until turned off', async ({
		timePicker,
		panels,
		queryRange,
	}) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.root()).toHaveAttribute('data-panel-visible', 'true');
		await expect(target.loading()).toBeHidden();

		await timePicker.autoRefresh.open();
		const checkbox = timePicker.autoRefresh.checkbox();
		await expect(checkbox).not.toBeChecked();
		await checkbox.click();
		await timePicker.autoRefresh.interval('5 seconds').click();
		await expect(timePicker.autoRefresh.selected()).toHaveText('5 seconds');

		const windows = queryRange.recordWindows();
		await expect
			.poll(() => windows.length, { timeout: 15_000 })
			.toBeGreaterThanOrEqual(2);

		await checkbox.click();
		await expect(checkbox).not.toBeChecked();
	});

	test('TC-05 manual refresh refetches the panels', async ({
		timePicker,
		panels,
		queryRange,
	}) => {
		const target = panels.panel(SINGLE_PANEL_ID);
		await expect(target.root()).toHaveAttribute('data-panel-visible', 'true');
		await expect(target.loading()).toBeHidden();

		const refetch = queryRange.nextRequest();
		await timePicker.refresh().click();

		await refetch;
	});
});
