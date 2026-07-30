import { expect, test } from '../../../fixtures/alert-rules';
import { alertRuleRows, gotoAlertList } from '../../../helpers/alerts';

test.describe('Alert rules list — row actions', () => {
	test('LR-14 Disable then Enable toggles the rule state', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-alert-row-toggle-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name);

		await gotoAlertList(page, { search: name });
		const row = alertRuleRows(page).first();
		await expect(row.getByTestId(`alert-row-${ruleId}-state`)).toHaveText('OK');

		await row.getByTestId('alert-actions').click();
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			page.getByRole('menuitem', { name: 'Disable' }).click(),
		]);

		await expect(row.getByTestId(`alert-row-${ruleId}-state`)).toHaveText(
			'Disabled',
		);

		await row.getByTestId('alert-actions').click();
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			page.getByRole('menuitem', { name: 'Enable' }).click(),
		]);

		await expect(row.getByTestId(`alert-row-${ruleId}-state`)).toHaveText('OK');
	});

	test('LR-15 Clone creates a copy and shows success toast', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-alert-row-clone-${Date.now()}`;
		await ownedRules.threshold(name);

		await gotoAlertList(page, { search: name });
		await alertRuleRows(page).first().getByTestId('alert-actions').click();

		const [createResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules$/.test(new URL(res.url()).pathname) &&
					res.request().method() === 'POST',
			),
			page.getByRole('menuitem', { name: 'Clone' }).click(),
		]);

		await ownedRules.register(createResponse);

		await expect(page.getByText('Alert cloned successfully')).toBeVisible();

		await gotoAlertList(page, { search: name });
		await expect(page.getByText(`${name} - Copy`)).toBeVisible();
	});

	test('LR-16 Delete removes the rule and shows success toast', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-alert-row-delete-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name);

		await gotoAlertList(page, { search: name });
		await alertRuleRows(page).first().getByTestId('alert-actions').click();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'DELETE',
			),
			page.getByRole('menuitem', { name: 'Delete' }).click(),
		]);

		await expect(page.getByText('Alert deleted successfully')).toBeVisible();
		await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	});
});
