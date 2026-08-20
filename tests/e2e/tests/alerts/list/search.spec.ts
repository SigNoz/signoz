import { expect, test } from '../../../fixtures/alerts/alert-rules';
import {
	ALERT_LIST_PAGE_SIZE,
	alertRuleRows,
	expectFirstPage,
	gotoAlertList,
	SEED_B_SEVERITIES,
} from '../../../helpers/alerts';

test.describe('Alert rules list — search', () => {
	test('TC-01 filters by name', async ({ authedPage: page, alertList }) => {
		await gotoAlertList(page);

		await page
			.getByTestId('list-alerts-search-input')
			.fill(`${alertList.namePrefix}-03`);

		await expect(page).toHaveURL(new RegExp(`search=${alertList.namePrefix}-03`));
		await expect(alertRuleRows(page)).toHaveCount(1);
		await expect(page.getByText(`${alertList.namePrefix}-03`)).toBeVisible();
	});

	test('TC-02 filters by severity and by label', async ({
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

	test('TC-03 shows no-results state with clear button', async ({
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

	test('TC-04 resets pagination when searching', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);

		await page.getByTestId('list-alerts-search-input').fill(alertList.namePrefix);

		await expectFirstPage(page);
	});

	test('TC-05 state and severity filters intersect, they do not union', async ({
		authedPage: page,
		alertList,
	}) => {
		const perSeverity = alertList.count / SEED_B_SEVERITIES.length;
		const scoped = { search: alertList.namePrefix };

		// One filter kind: a third of the batch.
		await gotoAlertList(page, {
			...scoped,
			alertRulesFilters: JSON.stringify(['severity:warning']),
		});
		await expect(alertRuleRows(page)).toHaveCount(perSeverity);
		for (const row of await alertRuleRows(page).all()) {
			await expect(row).toContainText('warning');
		}

		// Both kinds, both satisfied — seeded rules never fire, so they sit in
		// `inactive`. The intersection is unchanged.
		await gotoAlertList(page, {
			...scoped,
			alertRulesFilters: JSON.stringify(['severity:warning', 'state:inactive']),
		});
		await expect(alertRuleRows(page)).toHaveCount(perSeverity);

		// Both kinds, only one satisfied. Under AND this is empty; under OR the
		// severity match alone would still surface all `perSeverity` rules.
		await gotoAlertList(
			page,
			{
				...scoped,
				alertRulesFilters: JSON.stringify(['severity:warning', 'state:firing']),
			},
			{ expectRows: false },
		);
		await expect(alertRuleRows(page)).toHaveCount(0);
		await expect(page.getByText('No matching alert rules')).toBeVisible();
	});
});
