import { expect, test } from '../../../fixtures/alerts/alert-history';
import { ALERTS_LIST_PATH } from '../../../helpers/alerts/constants';
import { gotoAlertHistory } from '../../../helpers/alerts/history';

test.describe('Alert details — page chrome', () => {
	test('TC-01 copy-link button copies the current URL to clipboard', async ({
		authedPage: page,
		alertHistory,
		browserName,
	}) => {
		test.skip(
			browserName !== 'chromium',
			'clipboard-read permission is Chromium-only in Playwright',
		);
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

		await gotoAlertHistory(page, alertHistory.ruleId);
		const expected = page.url();

		await page.getByRole('button', { name: 'Copy link' }).click();
		await expect(page.getByText('Copied')).toBeVisible();

		const copied = await page.evaluate(() => navigator.clipboard.readText());
		expect(copied).toBe(expected);
	});

	test('TC-02 breadcrumb navigates back to the alert list', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		const breadcrumb = page.locator('.ant-breadcrumb');
		await expect(breadcrumb).toContainText('Alert Rules');
		await expect(breadcrumb).toContainText(alertHistory.ruleId);

		await breadcrumb.getByText('Alert Rules').click();

		await expect(page).toHaveURL(new RegExp(`${ALERTS_LIST_PATH}$`));
	});

	test('TC-03 document title updates to show the rule name', async ({
		authedPage: page,
		alertHistory,
	}) => {
		await gotoAlertHistory(page, alertHistory.ruleId);

		await expect
			.poll(() => page.title(), { timeout: 15_000 })
			.toContain('e2e-ah-rule-v2');
	});
});
