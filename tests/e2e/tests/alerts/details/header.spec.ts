import {
	expect,
	SEED_C_TEAM_LABEL,
	test,
} from '../../../fixtures/alerts/alert-history';
import { gotoAlertDetails } from '../../../helpers/alerts';

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
		await expect(page.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toHaveCount(0);
	});

	test('TC-02 v1 header shows static title with state, severity and labels', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertDetails(page, alertHistory.ruleIdV1);

		await expect(page.getByTestId('alert-details-root')).toHaveAttribute(
			'data-schema-version',
			'v1',
		);

		await expect(page.getByTestId('alert-header-title')).toBeVisible();
		await expect(page.getByTestId('alert-header-state')).toBeVisible();
		await expect(page.getByTestId('alert-header-severity')).toContainText(
			'Warning',
		);
		await expect(page.getByTestId('alert-header-labels')).toContainText(
			SEED_C_TEAM_LABEL,
		);
		await expect(page.getByTestId('alert-name-input')).toHaveCount(0);

		await page.getByTestId('alert-actions-menu').click();
		await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
	});
});
