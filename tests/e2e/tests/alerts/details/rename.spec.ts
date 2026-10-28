import { expect, test } from '../../../fixtures/alerts/alert-history';
import { ALERTS_LIST_PATH } from '../../../helpers/alerts/constants';
import { gotoAlertHistory } from '../../../helpers/alerts/history';
import { gotoAlertDetails } from '../../../helpers/alerts/navigation';

test.describe('Alert details — rename', () => {
	test('TC-01 v2 inline rename saves via Overview footer button', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const stamp = Date.now();
		const original = `e2e-ad-rename-v2-${stamp}`;
		const renamed = `${original}-renamed`;
		const ruleId = await ownedRules.logs({ name: original });

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
