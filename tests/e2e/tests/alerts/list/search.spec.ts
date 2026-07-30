import { expect, test } from '../../../fixtures/alert-rules';
import {
	ALERT_LIST_PAGE_SIZE,
	alertRuleRows,
	expectFirstPage,
	gotoAlertList,
	SEED_B_SEVERITIES,
} from '../../../helpers/alerts';

test.describe('Alert rules list — search', () => {
	test('LR-03 filters by name', async ({ authedPage: page, alertList }) => {
		await gotoAlertList(page);

		await page
			.getByTestId('list-alerts-search-input')
			.fill(`${alertList.namePrefix}-03`);

		await expect(page).toHaveURL(new RegExp(`search=${alertList.namePrefix}-03`));
		await expect(alertRuleRows(page)).toHaveCount(1);
		await expect(page.getByText(`${alertList.namePrefix}-03`)).toBeVisible();
	});

	test('LR-04 filters by severity and by label', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page);
		const search = page.getByTestId('list-alerts-search-input');

		const perSeverity = Math.floor(alertList.count / SEED_B_SEVERITIES.length);

		await search.fill('warning');
		await expect(page).toHaveURL(/search=warning/);
		await expect(alertRuleRows(page)).not.toHaveCount(0);
		for (const row of await alertRuleRows(page).all()) {
			await expect(row).toContainText('warning');
		}
		expect(await alertRuleRows(page).count()).toBeGreaterThanOrEqual(perSeverity);

		await search.fill(alertList.paymentsLabel);
		await expect(page).toHaveURL(new RegExp(`search=${alertList.paymentsLabel}`));
		await expect(alertRuleRows(page)).toHaveCount(alertList.count / 2);
	});

	test('LR-05 shows no-results state with clear button', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		await page
			.getByTestId('list-alerts-search-input')
			.fill('no-such-alert-anywhere');

		await expect(page.getByText('No matching alert rules')).toBeVisible();

		await page.getByRole('button', { name: 'Clear Search' }).click();

		await expect(page).not.toHaveURL(/search=/);
		await expect(alertRuleRows(page)).toHaveCount(ALERT_LIST_PAGE_SIZE);
	});

	test('LR-06 resets pagination when searching', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);

		await page.getByTestId('list-alerts-search-input').fill(alertList.namePrefix);

		await expectFirstPage(page);
	});
});
