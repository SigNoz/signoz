import { expect, test } from '../../../fixtures/alert-rules';
import { alertRuleRows, gotoAlertList } from '../../../helpers/alerts';

test.describe('Alert rules list — navigation', () => {
	test('LR-11 row click opens the overview page', async ({
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

	test('LR-12 ctrl/cmd-click opens the overview in a new tab', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		const [newPage] = await Promise.all([
			page.context().waitForEvent('page'),
			alertRuleRows(page)
				.first()
				.click({ modifiers: ['ControlOrMeta'] }),
		]);

		await newPage.waitForLoadState();
		expect(newPage.url()).toContain('/alerts/overview');
		expect(newPage.url()).toContain('ruleId=');
		await newPage.close();
	});

	test('LR-13 actions menu Edit and Edit in New Tab navigate correctly', async ({
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

	test('LR-17 New Alert button navigates to alert creation', async ({
		authedPage: page,
		alertList,
	}) => {
		await gotoAlertList(page, { search: alertList.namePrefix });

		await page.getByTestId('list-alerts-new-alert-button').click();

		await expect(page).toHaveURL(/\/alerts\/new/);
	});

	// eslint-disable-next-line playwright/expect-expect -- documented coverage gap
	test('LR-18 shows ErrorEmptyState when list fails to load', async () => {
		test.skip(
			true,
			'Not covered: the suite never stubs network, and there is no server-side ' +
				'way to make GET /api/v1/rules fail on demand. Left explicitly ' +
				'untested rather than mocked.',
		);
	});
});
