import { expect, test } from '../../../fixtures/alerts/alert-rules';
import {
	ALERT_LIST_PAGE_SIZE,
	SEED_B_SEVERITIES,
} from '../../../helpers/alerts/constants';
import { expectFirstPage } from '../../../helpers/alerts/history';
import {
	alertRuleRows,
	gotoAlertList,
	nameContains,
	runAlertListSearch,
} from '../../../helpers/alerts/navigation';

test.describe('Alert rules list — search', () => {
	test('TC-01 filters by name', async ({ authedPage: page, alertList }) => {
		await gotoAlertList(page);

		await runAlertListSearch(page, nameContains(`${alertList.namePrefix}-03`));

		await expect(alertRuleRows(page)).toHaveCount(1);
		await expect(page.getByText(`${alertList.namePrefix}-03`)).toBeVisible();
	});

	test('TC-02 filters by severity and by label', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page);
		const scope = nameContains(alertList.namePrefix);
		const perSeverity = alertList.count / SEED_B_SEVERITIES.length;

		await runAlertListSearch(page, `${scope} AND severity = 'warning'`);
		await expect(alertRuleRows(page)).toHaveCount(perSeverity);
		for (const row of await alertRuleRows(page).all()) {
			await expect(row).toContainText('warning');
		}

		await runAlertListSearch(page, `labels.team = '${alertList.paymentsLabel}'`);
		await expect(alertRuleRows(page)).toHaveCount(alertList.count / 2);
	});

	test('TC-03 shows no-results state with clear button', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { query: nameContains(alertList.namePrefix) });

		await runAlertListSearch(page, nameContains('no-such-alert-anywhere'));

		await expect(page.getByText('No matching alert rules')).toBeVisible();

		await page.getByRole('button', { name: 'Clear Search' }).click();

		await expect(page).not.toHaveURL(/[?&]query=/);
		await expect(alertRuleRows(page)).toHaveCount(ALERT_LIST_PAGE_SIZE);
	});

	test('TC-04 resets pagination when searching', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { page: '2' });
		await expect(page).toHaveURL(/[?&]page=2/);

		await runAlertListSearch(page, nameContains(alertList.namePrefix));

		await expectFirstPage(page);
	});

	test('TC-05 state and severity filters intersect, they do not union', async ({
		authedPage: page,
		alertList,
	}) => {
		const perSeverity = alertList.count / SEED_B_SEVERITIES.length;
		const query = `${nameContains(alertList.namePrefix)} AND severity = 'warning'`;

		// Seeded rules never fire, so they sit in `inactive`: the intersection is unchanged.
		await gotoAlertList(page, { query, states: 'inactive' });
		await expect(alertRuleRows(page)).toHaveCount(perSeverity);
		for (const row of await alertRuleRows(page).all()) {
			await expect(row).toContainText('warning');
		}

		// Under AND this is empty; under OR the severity match alone would still
		// surface all `perSeverity` rules.
		await gotoAlertList(page, { query, states: 'firing' }, { expectRows: false });
		await expect(alertRuleRows(page)).toHaveCount(0);
		await expect(page.getByText('No matching alert rules')).toBeVisible();
	});
});
