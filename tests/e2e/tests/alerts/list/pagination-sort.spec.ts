import { expect, test } from '../../../fixtures/alert-rules';
import {
	ALERT_LIST_PAGE_SIZE,
	alertRuleRows,
	gotoAlertList,
} from '../../../helpers/alerts';

test.describe('Alert rules list — pagination and sorting', () => {
	test('LR-07 navigates between pages', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		await expect(page.getByTestId('pagination-total-count')).toContainText(
			`of ${alertList.count}`,
		);
		await expect(alertRuleRows(page)).toHaveCount(ALERT_LIST_PAGE_SIZE);

		await page.getByLabel('Go to next page').click();

		await expect(page).toHaveURL(/[?&]page=2/);
		await expect(alertRuleRows(page)).toHaveCount(
			alertList.count - ALERT_LIST_PAGE_SIZE,
		);
		await expect(page.getByTestId('pagination-total-count')).toContainText(
			`${ALERT_LIST_PAGE_SIZE + 1} - ${alertList.count}`,
		);
	});

	test('LR-08 changes page size', async ({ authedPage: page, alertList }) => {
		await gotoAlertList(page, { search: alertList.namePrefix });
		await expect(alertRuleRows(page)).toHaveCount(ALERT_LIST_PAGE_SIZE);

		await page.getByTestId('pagination-page-size').click();
		await page.getByRole('option', { name: '20', exact: true }).click();

		await expect(page).toHaveURL(/[?&]limit=20/);
		await expect(alertRuleRows(page)).toHaveCount(alertList.count);
	});

	test('LR-09 sorts by column header click', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		const firstCell = alertRuleRows(page).first();
		const ascFirst = await firstCell.textContent();

		await page.getByRole('button', { name: 'Alert Name' }).click();
		await expect(page).toHaveURL(/[?&]orderBy=/);

		await page.getByRole('button', { name: 'Alert Name' }).click();
		await expect(page).toHaveURL(/[?&]orderBy=/);
		await expect(alertRuleRows(page).first()).not.toHaveText(ascFirst ?? '');
	});
});
