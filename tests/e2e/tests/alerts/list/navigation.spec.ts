import { expect, test } from '../../../fixtures/alert-rules';
import { alertRuleRows, gotoAlertList } from '../../../helpers/alerts';

test.describe('Alert rules list — navigation', () => {
	test('TC-01 row click opens the overview page', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		await alertRuleRows(page).first().click();

		await expect(page).toHaveURL(/\/alerts\/overview\?/);
		await expect(page).toHaveURL(/[?&]ruleId=/);
		await expect(page).toHaveURL(/[?&]compositeQuery=/);
		await expect(page).toHaveURL(/[?&]panelTypes=/);
	});

	test('TC-02 actions menu Edit and Edit in New Tab navigate correctly', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		await alertRuleRows(page).first().getByTestId('alert-actions').click();
		await page.getByRole('menuitem', { name: 'Edit in New Tab' }).waitFor();

		const [newPage] = await Promise.all([
			page.context().waitForEvent('page'),
			page.getByRole('menuitem', { name: 'Edit in New Tab' }).click(),
		]);
		await newPage.waitForLoadState();
		expect(newPage.url()).toContain('/alerts/overview');
		await newPage.close();

		await alertRuleRows(page).first().getByTestId('alert-actions').click();
		await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();

		await expect(page).toHaveURL(/\/alerts\/overview\?/);
		await expect(page).toHaveURL(/[?&]ruleId=/);
	});

	test('TC-03 New Alert button navigates to alert creation', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		await page.getByTestId('list-alerts-new-alert-button').click();

		await expect(page).toHaveURL(/\/alerts\/new/);
	});
});
