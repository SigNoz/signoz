import { expect, test } from '../../../fixtures/alerts/alert-rules';
import { ALERT_LIST_PAGE_SIZE } from '../../../helpers/alerts/constants';
import {
	alertRuleRows,
	gotoAlertList,
} from '../../../helpers/alerts/navigation';

test.describe('Alert rules list — columns', () => {
	test('TC-01 renders all default columns (Status, Alert Name, Severity, Labels, Actions)', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		for (const header of ['Status', 'Alert Name', 'Severity', 'Labels']) {
			await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
		}
		await expect(
			page.getByRole('columnheader', { name: 'Actions' }),
		).toBeVisible();
		for (const hidden of [
			'Created At',
			'Created By',
			'Updated At',
			'Updated By',
		]) {
			await expect(page.getByRole('columnheader', { name: hidden })).toHaveCount(
				0,
			);
		}

		await expect(alertRuleRows(page)).toHaveCount(ALERT_LIST_PAGE_SIZE);
		await expect(page.getByTestId('alert-columns-button')).toBeVisible();
	});

	test('TC-02 column selector hides and shows a column', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });
		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toBeVisible();

		await page.getByTestId('alert-columns-button').click();
		await page.getByText('Toggle Columns').waitFor();
		const severityToggle = page.locator('label', { hasText: 'Severity' });
		await severityToggle.click();

		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toHaveCount(0);

		await page.reload();
		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toHaveCount(0);

		await page.getByTestId('alert-columns-button').click();
		await page.locator('label', { hasText: 'Severity' }).click();
		await expect(
			page.getByRole('columnheader', { name: 'Severity' }),
		).toBeVisible();
	});

	test('TC-03 sorts by column header click', async ({
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
