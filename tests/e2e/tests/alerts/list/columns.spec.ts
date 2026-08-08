import { expect, test } from '../../../fixtures/alert-rules';
import {
	ALERT_LIST_PAGE_SIZE,
	alertRuleRows,
	gotoAlertList,
} from '../../../helpers/alerts';

test.describe('Alert rules list — columns', () => {
	test('LR-01 renders all default columns (Status, Alert Name, Severity, Labels, Actions)', async ({
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

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('LR-02 shows empty state when no rules exist', async () => {
		test.skip(
			true,
			'AlertsEmptyState needs a zero-rule workspace; unreachable without ' +
				'tearing down SEED-B mid-suite. Covered by the component test.',
		);
	});

	test('LR-10 column selector hides and shows a column', async ({
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
});
