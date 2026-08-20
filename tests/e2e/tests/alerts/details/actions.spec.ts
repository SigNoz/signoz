import { expect, test } from '../../../fixtures/alerts/alert-history';
import {
	ALERT_OVERVIEW_PATH,
	ALERTS_LIST_PATH,
	gotoAlertDetails,
} from '../../../helpers/alerts';

test.describe('Alert details — actions', () => {
	test('TC-01 enable/disable toggle changes the rule state', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.logs({
			name: `e2e-ad-toggle-${Date.now()}`,
			schema: 'v2',
		});

		await gotoAlertDetails(page, ruleId);

		const toggle = page.getByTestId('alert-actions-toggle');
		await expect(toggle).toBeVisible();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			toggle.click(),
		]);

		await expect(page.getByText('Alert has been disabled.')).toBeVisible();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'PATCH',
			),
			toggle.click(),
		]);

		await expect(page.getByText('Alert has been enabled.')).toBeVisible();
	});

	test('TC-02 Duplicate creates a copy and navigates to overview', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ad-duplicate-${Date.now()}`;
		const ruleId = await ownedRules.logs({ name, schema: 'v2' });

		await gotoAlertDetails(page, ruleId);
		await page.getByTestId('alert-actions-menu').click();

		const [createResponse] = await Promise.all([
			page.waitForResponse(
				(res) =>
					/\/api\/v\d\/rules$/.test(new URL(res.url()).pathname) &&
					res.request().method() === 'POST',
			),
			page.getByRole('menuitem', { name: 'Duplicate' }).click(),
		]);
		await ownedRules.register(createResponse);

		await expect(page).toHaveURL(new RegExp(ALERT_OVERVIEW_PATH));
		await expect(page).toHaveURL(/[?&]ruleId=/);

		await page.goto(`${ALERTS_LIST_PATH}?search=${name}`);
		await expect(page.getByText(`${name} - Copy`)).toBeVisible();
	});

	test('TC-03 Delete removes the rule and returns to the list', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ad-delete-${Date.now()}`;
		const ruleId = await ownedRules.logs({ name, schema: 'v2' });

		await gotoAlertDetails(page, ruleId);
		await page.getByTestId('alert-actions-menu').click();

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					res.request().method() === 'DELETE',
			),
			page.getByRole('menuitem', { name: 'Delete' }).click(),
		]);

		await expect(page).toHaveURL(new RegExp(`${ALERTS_LIST_PATH}$`));
		await page.goto(`${ALERTS_LIST_PATH}?search=${name}`);
		await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	});
});
