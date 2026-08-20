import { expect, test } from '../../../fixtures/alert-history';
import {
	ALERT_HISTORY_PATH,
	ALERT_OVERVIEW_PATH,
	DEFAULT_RELATIVE_TIME,
	gotoAlertDetails,
	gotoAlertHistory,
} from '../../../helpers/alerts';

test.describe('Alert details — tabs', () => {
	test('TC-01 Overview/History tabs preserve ruleId and relativeTime', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertDetails(page, alertHistory.ruleId);

		await page.getByTestId('alert-details-tab-history').click();

		await expect(page).toHaveURL(new RegExp(ALERT_HISTORY_PATH));
		await expect(page).toHaveURL(new RegExp(`ruleId=${alertHistory.ruleId}`));
		await expect(page).toHaveURL(
			new RegExp(`relativeTime=${DEFAULT_RELATIVE_TIME}`),
		);
		await expect(
			page.getByTestId('alert-details-tab-history').getByText('Beta'),
		).toBeVisible();

		await page.getByTestId('alert-details-tab-overview').click();

		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(new RegExp(`ruleId=${alertHistory.ruleId}`));
	});

	test('TC-02 switching to History tab discards other history params', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId, {
			page: '2',
			order: 'desc',
			timelineFilter: 'FIRED',
		});

		await page.getByTestId('alert-details-tab-overview').click();
		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(/[?&]timelineFilter=FIRED/);

		await page.getByTestId('alert-details-tab-history').click();

		await expect(page).toHaveURL(new RegExp(ALERT_HISTORY_PATH));
		const search = new URL(page.url()).searchParams;
		expect([...search.keys()].sort()).toEqual(['relativeTime', 'ruleId']);
		expect(search.get('ruleId')).toBe(alertHistory.ruleId);
	});
});
