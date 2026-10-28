import { expect, test } from '../../../fixtures/alerts/alert-history';
import { gotoAlertDetails } from '../../../helpers/alerts/navigation';

test.describe('Alert details — header', () => {
	test('TC-01 v2 header shows editable name input without Rename menu item', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertDetails(page, alertHistory.ruleId);

		await expect(page.getByTestId('alert-details-root')).toHaveAttribute(
			'data-schema-version',
			'v2alpha1',
		);

		const nameInput = page.getByTestId('alert-name-input');
		await expect(nameInput).toBeVisible();
		await expect(nameInput).not.toHaveValue('');
		await expect(nameInput).toBeEditable();

		await page.getByTestId('alert-actions-menu').click();
		await expect(page.getByRole('menuitem', { name: 'Clone' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveCount(0);
	});
});
