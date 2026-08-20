import { expect, test } from '../../../fixtures/alerts/alert-history';
import {
	ALERTS_LIST_PATH,
	gotoAlertDetails,
	gotoAlertHistory,
} from '../../../helpers/alerts';

test.describe('Alert details — rename', () => {
	test('TC-01 v1 rename via modal updates the rule name', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const stamp = Date.now();
		const original = `e2e-ad-rename-v1-${stamp}`;
		const renamed = `${original}-renamed`;
		const ruleId = await ownedRules.logs({ name: original, schema: 'v1' });

		await gotoAlertDetails(page, ruleId);
		await expect(page.getByTestId('alert-header-title')).toContainText(original);

		await page.getByTestId('alert-actions-menu').click();
		await page.getByRole('menuitem', { name: 'Rename' }).click();

		const modalInput = page.getByTestId('alert-name');
		await expect(modalInput).toBeVisible();
		await modalInput.fill(renamed);
		await page.getByRole('button', { name: 'Rename Alert' }).click();

		await expect(page.getByText('Alert renamed successfully')).toBeVisible();
		await expect(page.getByTestId('alert-header-title')).toContainText(renamed);

		await page.goto(`${ALERTS_LIST_PATH}?search=${renamed}`);
		await expect(page.getByText(renamed)).toBeVisible();
	});

	test('TC-02 v2 inline rename saves via Overview footer button', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const stamp = Date.now();
		const original = `e2e-ad-rename-v2-${stamp}`;
		const renamed = `${original}-renamed`;
		const ruleId = await ownedRules.logs({ name: original, schema: 'v2' });

		await gotoAlertDetails(page, ruleId);

		const nameInput = page.getByTestId('alert-name-input');
		await expect(nameInput).toHaveValue(original);
		await nameInput.fill(renamed);

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/api/v2/rules/${ruleId}`) &&
					['PUT', 'POST', 'PATCH'].includes(res.request().method()),
			),
			page.getByRole('button', { name: 'Save Alert Rule' }).click(),
		]);

		await page.goto(`${ALERTS_LIST_PATH}?search=${renamed}`);
		await expect(page.getByText(renamed)).toBeVisible();

		await gotoAlertHistory(page, ruleId);
		const historyInput = page.getByTestId('alert-name-input');
		await historyInput.fill(`${renamed}-unsaved`);
		await expect(
			page.getByRole('button', { name: 'Save Alert Rule' }),
		).toHaveCount(0);

		await page.goto(`${ALERTS_LIST_PATH}?search=${renamed}`);
		await expect(page.getByText(renamed)).toBeVisible();
		await expect(page.getByText(`${renamed}-unsaved`)).toHaveCount(0);
	});
});
